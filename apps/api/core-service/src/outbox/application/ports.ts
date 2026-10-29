import type { OutboxMessage } from '../domain/outbox-message.js';

export interface ClaimOptions {
  workerId: string;
  limit: number;
  leaseMs: number;
}

/**
 * Persistence for the relay. Every mutating call is conditional on the caller still holding
 * the lease (`locked_by = workerId`, status pending) and returns false when it does not.
 */
export interface OutboxStore {
  /**
   * Leases up to `limit` due rows (pending, available_at <= now, lease free or expired) using
   * FOR UPDATE SKIP LOCKED, incrementing `attempts`. A row is never claimed while an earlier
   * sequence for the same correlation_id is unpublished, so commands leave in order.
   * Returned oldest first.
   */
  claimDue(options: ClaimOptions): Promise<OutboxMessage[]>;
  markPublished(id: string, workerId: string): Promise<boolean>;
  /** Schedules another attempt `delayMs` from now (database clock) and releases the lease. */
  markRetry(id: string, workerId: string, error: string, delayMs: number): Promise<boolean>;
  /** Parks the row for an operator; it blocks later sequences of the same execution. */
  markDead(id: string, workerId: string, error: string): Promise<boolean>;
  /** Releases a lease without consuming an attempt (claimed but not tried). */
  release(id: string, workerId: string): Promise<boolean>;
}
export const OUTBOX_STORE = Symbol('OUTBOX_STORE');

export class PublishError extends Error {
  constructor(
    message: string,
    readonly retriable: boolean,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'PublishError';
  }
}

export interface EventPublisher {
  /** Resolves once the broker acknowledged the record (acks=all). @throws PublishError */
  publish(message: OutboxMessage): Promise<void>;
}
export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');

export interface RelayPolicy {
  batchSize: number;
  leaseMs: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
  /** 0 = unlimited for retriable failures. */
  maxAttempts: number;
}
export const RELAY_POLICY = Symbol('RELAY_POLICY');
export const OUTBOX_WORKER_ID = Symbol('OUTBOX_WORKER_ID');
