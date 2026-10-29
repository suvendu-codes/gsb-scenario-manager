import { beforeEach, describe, expect, it } from 'vitest';
import type { OutboxMessage, OutboxMessageDraft } from '../domain/outbox-message.js';
import { InMemoryOutboxStore } from '../infrastructure/in-memory-outbox.store.js';
import { OutboxRelay } from './outbox-relay.js';
import { PublishError, type EventPublisher, type RelayPolicy } from './ports.js';

class FakePublisher implements EventPublisher {
  sent: OutboxMessage[] = [];
  /** Queue of failures to throw, one per publish call; undefined = succeed. */
  failures: (Error | undefined)[] = [];
  onPublish?: (m: OutboxMessage) => void;

  async publish(message: OutboxMessage) {
    this.onPublish?.(message);
    const failure = this.failures.shift();
    if (failure) throw failure;
    this.sent.push(message);
  }
}

const policy: RelayPolicy = { batchSize: 10, leaseMs: 1000, backoffBaseMs: 100, backoffMaxMs: 1000, maxAttempts: 0 };

let n = 0;
const draft = (correlationId: string, sequence = 1): OutboxMessageDraft => ({
  id: `o-${++n}`,
  scenarioId: 's',
  runId: 'r',
  correlationId,
  engine: 'emulator',
  eventType: 'run.trigger',
  commandId: 'run',
  sequence,
  topic: 't',
  messageKey: correlationId,
  payload: { correlation_id: correlationId, sequence },
  headers: {},
});

describe('OutboxRelay', () => {
  let now: number;
  let store: InMemoryOutboxStore;
  let publisher: FakePublisher;
  const relay = (p: Partial<RelayPolicy> = {}) =>
    new OutboxRelay(store, publisher, { ...policy, ...p }, 'w1', () => 1);

  beforeEach(() => {
    now = 0;
    store = new InMemoryOutboxStore(() => now);
    publisher = new FakePublisher();
  });

  it('does nothing when the outbox is empty', async () => {
    expect(await relay().runOnce()).toEqual({
      claimed: 0, published: 0, retried: 0, dead: 0, released: 0, leaseLost: 0,
    });
  });

  it('publishes due rows in order and marks them published', async () => {
    store.insert(draft('a'));
    now += 1;
    store.insert(draft('b'));
    const result = await relay().runOnce();
    expect(result).toMatchObject({ claimed: 2, published: 2 });
    expect(publisher.sent.map((m) => m.correlationId)).toEqual(['a', 'b']);
    expect(store.rows.every((r) => r.status === 'published')).toBe(true);
  });

  it('sends the stored payload unchanged', async () => {
    store.insert(draft('a'));
    await relay().runOnce();
    expect(publisher.sent[0].payload).toEqual({ correlation_id: 'a', sequence: 1 });
    expect(publisher.sent[0].messageKey).toBe('a');
  });

  it('schedules a backoff retry on a retriable failure and releases the rest of the batch', async () => {
    ['a', 'b', 'c'].forEach((c, i) => {
      now = i;
      store.insert(draft(c));
    });
    publisher.failures = [new PublishError('broker down', true)];

    const result = await relay().runOnce();
    expect(result).toMatchObject({ claimed: 3, published: 0, retried: 1, released: 2 });
    const [a, b, c] = store.rows;
    expect(a).toMatchObject({ status: 'pending', attempts: 1, lastError: 'PublishError: broker down' });
    expect(a.availableAt).toBe(now + 100); // attempt 1 → base delay
    expect(b.attempts).toBe(0);
    expect(c.attempts).toBe(0);
    expect(b.lockedBy).toBeNull();
  });

  it('treats unknown errors as retriable', async () => {
    store.insert(draft('a'));
    publisher.failures = [new Error('socket hang up')];
    expect(await relay().runOnce()).toMatchObject({ retried: 1, dead: 0 });
  });

  it('parks a non-retriable failure and continues with the batch', async () => {
    store.insert(draft('a'));
    now += 1;
    store.insert(draft('b'));
    publisher.failures = [new PublishError('message too large', false)];

    const result = await relay().runOnce();
    expect(result).toMatchObject({ claimed: 2, dead: 1, published: 1 });
    expect(store.rows[0]).toMatchObject({ status: 'dead', lastError: 'PublishError: message too large' });
    expect(store.rows[1].status).toBe('published');
  });

  it('parks after maxAttempts retriable failures', async () => {
    store.insert(draft('a'));
    const r = relay({ maxAttempts: 2 });
    publisher.failures = [new PublishError('down', true), new PublishError('down', true)];

    expect(await r.runOnce()).toMatchObject({ retried: 1 });
    now += 10_000;
    expect(await r.runOnce()).toMatchObject({ dead: 1 });
    expect(store.rows[0]).toMatchObject({ status: 'dead', attempts: 2 });
  });

  it('eventually delivers after transient failures with the same payload', async () => {
    store.insert(draft('a'));
    const r = relay();
    publisher.failures = [new PublishError('down', true), new PublishError('down', true)];
    for (let i = 0; i < 3; i++) {
      await r.runOnce();
      now += 10_000;
    }
    expect(publisher.sent).toHaveLength(1);
    expect(store.rows[0]).toMatchObject({ status: 'published', attempts: 3, lastError: null });
  });

  it('counts a lost lease without overwriting the new holder', async () => {
    store.insert(draft('a'));
    // Simulate a slow send: our lease expires and another worker takes the row.
    publisher.onPublish = () => {
      now += 5000;
      void store.claimDue({ workerId: 'w2', limit: 10, leaseMs: 1000 });
    };
    const result = await relay().runOnce();
    expect(result).toMatchObject({ published: 0, leaseLost: 1 });
    expect(store.rows[0]).toMatchObject({ status: 'pending', lockedBy: 'w2' });
  });

  it('delivers an execution’s commands in sequence order across passes', async () => {
    store.insert(draft('a', 1));
    store.insert(draft('a', 2));
    const r = relay();
    await r.runOnce();
    await r.runOnce();
    expect(publisher.sent.map((m) => m.sequence)).toEqual([1, 2]);
  });

  it('crash between publish and mark-sent: the row is re-sent after the lease expires (repeat, not loss)', async () => {
    store.insert(draft('a'));
    // Worker 1 publishes, then "crashes" before recording the outcome.
    const crashing = new OutboxRelay(store, publisher, policy, 'w-crash', () => 1);
    const realMark = store.markPublished.bind(store);
    store.markPublished = async () => {
      throw new Error('process killed');
    };
    await expect(crashing.runOnce()).rejects.toThrow('process killed');
    store.markPublished = realMark;

    expect(publisher.sent).toHaveLength(1);
    expect(store.rows[0]).toMatchObject({ status: 'pending', lockedBy: 'w-crash' });

    // Before the lease expires nobody else may take the row.
    const survivor = new OutboxRelay(store, publisher, policy, 'w-next', () => 1);
    expect(await survivor.runOnce()).toMatchObject({ claimed: 0 });

    now += policy.leaseMs + 1;
    expect(await survivor.runOnce()).toMatchObject({ claimed: 1, published: 1 });

    expect(publisher.sent).toHaveLength(2);
    expect(publisher.sent[1].payload).toEqual(publisher.sent[0].payload);
    expect(publisher.sent[1].messageKey).toBe(publisher.sent[0].messageKey);
    expect(publisher.sent[1].sequence).toBe(publisher.sent[0].sequence);
    expect(store.rows[0]).toMatchObject({ status: 'published', attempts: 2 });
  });

  describe('lease vs batch (PR #54 review)', () => {
    it('renews each row right before its send, so a row being sent is never claimable by another worker', async () => {
      ['a', 'b', 'c'].forEach((c, i) => {
        now = i;
        store.insert(draft(c));
      });
      const stolen: string[] = [];
      // Each send takes 70% of the lease; the batch as a whole outlives the claim-time lease.
      publisher.onPublish = (m) => {
        now += policy.leaseMs * 0.7;
        // The in-memory claim mutates synchronously, so its effect is visible right away.
        void store.claimDue({ workerId: 'w2', limit: 10, leaseMs: policy.leaseMs });
        const heldByW2 = store.rows.filter((r) => r.lockedBy === 'w2').map((r) => r.id);
        expect(heldByW2).not.toContain(m.id);
        stolen.push(...heldByW2);
      };

      const result = await relay().runOnce();
      const sentIds = publisher.sent.map((m) => m.id);
      // Rows w2 reclaimed while w1 was busy are skipped by w1, never sent twice.
      expect(sentIds.filter((id) => stolen.includes(id))).toEqual([]);
      expect(new Set(sentIds).size).toBe(sentIds.length);
      expect(result.published + result.leaseLost).toBe(3);
      expect(result.published).toBeGreaterThanOrEqual(2);
    });

    it('skips rows whose lease another worker already took, without sending them', async () => {
      store.insert(draft('a'));
      store.insert(draft('b'));
      const claim = store.claimDue.bind(store);
      store.claimDue = async (opts) => {
        const rows = await claim(opts);
        now += policy.leaseMs * 2; // this worker stalls after claiming
        await claim({ workerId: 'w2', limit: 10, leaseMs: policy.leaseMs });
        return rows;
      };
      const result = await relay().runOnce();
      expect(result).toMatchObject({ claimed: 2, published: 0, leaseLost: 2 });
      expect(publisher.sent).toHaveLength(0);
      expect(store.rows.every((r) => r.lockedBy === 'w2')).toBe(true);
    });
  });

  it('a dead run command triggers the run-failure hook; other commands do not', async () => {
    const dead: string[] = [];
    store.onRunTriggerDead = (row) => dead.push(row.correlationId);
    store.insert(draft('a'));
    store.insert({ ...draft('b', 2), commandId: 'pause', eventType: 'run.pause' });
    publisher.failures = [new PublishError('too large', false)];
    await relay().runOnce();
    expect(dead).toEqual(['a']);
  });

  it('propagates store failures to the caller', async () => {
    store.claimDue = async () => {
      throw new Error('db down');
    };
    await expect(relay().runOnce()).rejects.toThrow('db down');
  });
});
