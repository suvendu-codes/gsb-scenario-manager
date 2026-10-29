import { Injectable } from '@nestjs/common';
import type { ClaimOptions, OutboxStore } from '../application/ports.js';
import type { OutboxMessage, OutboxMessageDraft, OutboxStatus } from '../domain/outbox-message.js';

export interface InMemoryOutboxRow extends OutboxMessageDraft {
  status: OutboxStatus;
  attempts: number;
  availableAt: number;
  lockedBy: string | null;
  lockedUntil: number | null;
  lastError: string | null;
  createdAt: Date;
  publishedAt: Date | null;
}

/**
 * Same semantics as DrizzleOutboxStore (lease, ordering per correlation, conditional updates),
 * single-process only. Used by unit and in-process module tests; `now` is injectable.
 */
@Injectable()
export class InMemoryOutboxStore implements OutboxStore {
  readonly rows: InMemoryOutboxRow[] = [];
  private seq = 0;

  constructor(private readonly now: () => number = () => Date.now()) {}

  /** Mirrors insertOutboxMessage; enforces the (correlation_id, sequence) unique key. */
  insert(draft: OutboxMessageDraft) {
    if (this.rows.some((r) => r.correlationId === draft.correlationId && r.sequence === draft.sequence)) {
      throw Object.assign(new Error('duplicate key'), {
        code: '23505',
        constraint: 'run_outbox_correlation_sequence_key',
      });
    }
    const createdAt = new Date(this.now() + this.seq++ / 1000);
    this.rows.push({
      ...structuredClone(draft),
      status: 'pending',
      attempts: 0,
      availableAt: this.now(),
      lockedBy: null,
      lockedUntil: null,
      lastError: null,
      createdAt,
      publishedAt: null,
    });
  }

  async claimDue({ workerId, limit, leaseMs }: ClaimOptions): Promise<OutboxMessage[]> {
    const now = this.now();
    const due = this.rows
      .filter(
        (r) =>
          r.status === 'pending' &&
          r.availableAt <= now &&
          (r.lockedUntil === null || r.lockedUntil < now) &&
          !this.rows.some(
            (e) => e.correlationId === r.correlationId && e.sequence < r.sequence && e.status !== 'published',
          ),
      )
      .sort((a, b) => a.availableAt - b.availableAt || a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit);
    for (const row of due) {
      row.lockedBy = workerId;
      row.lockedUntil = now + leaseMs;
      row.attempts += 1;
    }
    return due
      .map((r) => ({
        ...structuredClone(r),
      }))
      .map(toMessage);
  }

  async markPublished(id: string, workerId: string) {
    return this.update(id, workerId, (r) => {
      r.status = 'published';
      r.publishedAt = new Date(this.now());
      r.lastError = null;
    });
  }

  async markRetry(id: string, workerId: string, error: string, delayMs: number) {
    return this.update(id, workerId, (r) => {
      r.availableAt = this.now() + delayMs;
      r.lastError = error;
    });
  }

  async markDead(id: string, workerId: string, error: string) {
    return this.update(id, workerId, (r) => {
      r.status = 'dead';
      r.lastError = error;
    });
  }

  async release(id: string, workerId: string) {
    return this.update(id, workerId, (r) => {
      r.attempts = Math.max(0, r.attempts - 1);
    });
  }

  private update(id: string, workerId: string, change: (row: InMemoryOutboxRow) => void) {
    const row = this.rows.find((r) => r.id === id);
    if (!row || row.lockedBy !== workerId || row.status !== 'pending') return false;
    change(row);
    row.lockedBy = null;
    row.lockedUntil = null;
    return true;
  }
}

const toMessage = (row: InMemoryOutboxRow): OutboxMessage => ({
  id: row.id,
  scenarioId: row.scenarioId,
  runId: row.runId,
  correlationId: row.correlationId,
  engine: row.engine,
  eventType: row.eventType,
  commandId: row.commandId,
  sequence: row.sequence,
  topic: row.topic,
  messageKey: row.messageKey,
  payload: row.payload,
  headers: row.headers,
  attempts: row.attempts,
  createdAt: row.createdAt,
});
