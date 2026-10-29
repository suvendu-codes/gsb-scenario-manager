import { beforeEach, describe, expect, it } from 'vitest';
import type { OutboxMessageDraft } from '../domain/outbox-message.js';
import { InMemoryOutboxStore } from './in-memory-outbox.store.js';

let n = 0;
const draft = (correlationId: string, sequence = 1): OutboxMessageDraft => ({
  id: `o-${++n}`,
  scenarioId: 's',
  runId: `r-${correlationId}`,
  correlationId,
  engine: 'emulator',
  eventType: sequence === 1 ? 'run.trigger' : 'run.pause',
  commandId: sequence === 1 ? 'run' : 'pause',
  sequence,
  topic: 't',
  messageKey: correlationId,
  payload: { correlation_id: correlationId, sequence },
  headers: {},
});

const claim = (store: InMemoryOutboxStore, workerId = 'w1', limit = 10, leaseMs = 1000) =>
  store.claimDue({ workerId, limit, leaseMs });

describe('InMemoryOutboxStore', () => {
  let now: number;
  let store: InMemoryOutboxStore;

  beforeEach(() => {
    now = 1_000_000;
    store = new InMemoryOutboxStore(() => now);
  });

  it('claims due rows oldest first and increments attempts', async () => {
    store.insert(draft('a'));
    now += 1;
    store.insert(draft('b'));
    const claimed = await claim(store);
    expect(claimed.map((m) => m.correlationId)).toEqual(['a', 'b']);
    expect(claimed.every((m) => m.attempts === 1)).toBe(true);
  });

  it('respects the batch limit', async () => {
    ['a', 'b', 'c'].forEach((c) => store.insert(draft(c)));
    expect(await claim(store, 'w1', 2)).toHaveLength(2);
    expect(await claim(store, 'w2', 2)).toHaveLength(1);
  });

  it('hides leased rows from other workers until the lease expires', async () => {
    store.insert(draft('a'));
    expect(await claim(store, 'w1')).toHaveLength(1);
    expect(await claim(store, 'w2')).toHaveLength(0);
    now += 1001;
    const reclaimed = await claim(store, 'w2');
    expect(reclaimed).toHaveLength(1);
    expect(reclaimed[0].attempts).toBe(2);
    // the old holder can no longer record an outcome
    expect(await store.markPublished(reclaimed[0].id, 'w1')).toBe(false);
    expect(await store.markPublished(reclaimed[0].id, 'w2')).toBe(true);
  });

  it('never claims a later sequence while an earlier one is unpublished', async () => {
    store.insert(draft('a', 1));
    store.insert(draft('a', 2));
    const first = await claim(store);
    expect(first.map((m) => m.sequence)).toEqual([1]);
    await store.markPublished(first[0].id, 'w1');
    expect((await claim(store)).map((m) => m.sequence)).toEqual([2]);
  });

  it('keeps later sequences blocked behind a dead row', async () => {
    store.insert(draft('a', 1));
    store.insert(draft('a', 2));
    const [m] = await claim(store);
    await store.markDead(m.id, 'w1', 'boom');
    expect(await claim(store)).toHaveLength(0);
  });

  it('delays retried rows and records the error', async () => {
    store.insert(draft('a'));
    const [m] = await claim(store);
    expect(await store.markRetry(m.id, 'w1', 'broker down', 5000)).toBe(true);
    expect(store.rows[0]).toMatchObject({ status: 'pending', lastError: 'broker down', lockedBy: null });
    expect(await claim(store)).toHaveLength(0);
    now += 5000;
    expect(await claim(store)).toHaveLength(1);
  });

  it('release returns the row without consuming the attempt', async () => {
    store.insert(draft('a'));
    const [m] = await claim(store);
    expect(await store.release(m.id, 'w1')).toBe(true);
    expect(store.rows[0].attempts).toBe(0);
    expect((await claim(store))[0].attempts).toBe(1);
  });

  it('marks published once and refuses further transitions', async () => {
    store.insert(draft('a'));
    const [m] = await claim(store);
    expect(await store.markPublished(m.id, 'w1')).toBe(true);
    expect(store.rows[0].status).toBe('published');
    expect(store.rows[0].publishedAt).toBeInstanceOf(Date);
    expect(await store.markRetry(m.id, 'w1', 'x', 1)).toBe(false);
    expect(await store.markDead(m.id, 'w1', 'x')).toBe(false);
    expect(await claim(store)).toHaveLength(0);
  });

  it('renews a lease only for its holder', async () => {
    store.insert(draft('a'));
    const [m] = await claim(store, 'w1', 10, 1000);
    now += 900;
    expect(await store.renewLease(m.id, 'w1', 1000)).toBe(true);
    now += 900; // past the original lease, inside the renewed one
    expect(await claim(store, 'w2')).toHaveLength(0);
    expect(await store.renewLease(m.id, 'w2', 1000)).toBe(false);
    now += 200;
    expect(await claim(store, 'w2')).toHaveLength(1);
    expect(await store.renewLease(m.id, 'w1', 1000)).toBe(false);
  });

  it('enforces the (correlation_id, sequence) unique key', () => {
    store.insert(draft('a', 1));
    expect(() => store.insert(draft('a', 1))).toThrow(/duplicate key/);
  });

  it('returns copies so callers cannot mutate stored rows', async () => {
    store.insert(draft('a'));
    const [m] = await claim(store);
    (m.payload as Record<string, unknown>).tampered = true;
    expect(store.rows[0].payload).not.toHaveProperty('tampered');
  });
});
