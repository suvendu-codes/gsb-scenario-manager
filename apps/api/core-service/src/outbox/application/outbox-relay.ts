import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { decideOnFailure, describeError } from '../domain/retry-policy.js';
import {
  EVENT_PUBLISHER,
  OUTBOX_STORE,
  OUTBOX_WORKER_ID,
  PublishError,
  RELAY_POLICY,
  type EventPublisher,
  type OutboxStore,
  type RelayPolicy,
} from './ports.js';

export interface RelayResult {
  claimed: number;
  published: number;
  retried: number;
  dead: number;
  released: number;
  /** Rows whose lease was taken over before we could record the outcome. */
  leaseLost: number;
}

export const RELAY_RANDOM = Symbol('RELAY_RANDOM');

/**
 * One delivery pass: lease due rows, send each to Kafka in claim order, record the outcome.
 *
 * Delivery is at-least-once: if the process dies after Kafka acked but before `markPublished`
 * commits, the lease expires and the identical payload is re-sent. Engines deduplicate on
 * (correlation_id, sequence) as the Event Schema requires.
 */
@Injectable()
export class OutboxRelay {
  private readonly logger = new Logger(OutboxRelay.name);

  constructor(
    @Inject(OUTBOX_STORE) private readonly store: OutboxStore,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
    @Inject(RELAY_POLICY) private readonly policy: RelayPolicy,
    @Inject(OUTBOX_WORKER_ID) private readonly workerId: string,
    @Optional() @Inject(RELAY_RANDOM) private readonly random: () => number = Math.random,
  ) {}

  async runOnce(): Promise<RelayResult> {
    const result: RelayResult = { claimed: 0, published: 0, retried: 0, dead: 0, released: 0, leaseLost: 0 };
    const messages = await this.store.claimDue({
      workerId: this.workerId,
      limit: this.policy.batchSize,
      leaseMs: this.policy.leaseMs,
    });
    result.claimed = messages.length;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const context = {
        outbox_id: message.id,
        event_type: message.eventType,
        correlation_id: message.correlationId,
        sequence: message.sequence,
        topic: message.topic,
        attempt: message.attempts,
      };

      try {
        await this.publisher.publish(message);
      } catch (error) {
        const retriable = error instanceof PublishError ? error.retriable : true;
        const reason = describeError(error);
        const decision = decideOnFailure({
          retriable,
          attempts: message.attempts,
          maxAttempts: this.policy.maxAttempts,
          baseMs: this.policy.backoffBaseMs,
          maxMs: this.policy.backoffMaxMs,
          random: this.random,
        });

        if (decision.action === 'dead') {
          const ok = await this.store.markDead(message.id, this.workerId, reason);
          if (ok) result.dead++;
          else result.leaseLost++;
          this.logger.error({ event: 'outbox_message_dead', ...context, retriable, error: reason });
        } else {
          const ok = await this.store.markRetry(message.id, this.workerId, reason, decision.delayMs);
          if (ok) result.retried++;
          else result.leaseLost++;
          this.logger.warn({ event: 'outbox_publish_failed', ...context, retry_in_ms: decision.delayMs, error: reason });
        }

        // A retriable failure usually means the broker is unhealthy: hand the rest of the
        // batch back untouched instead of burning their attempts.
        if (retriable) {
          for (const rest of messages.slice(i + 1)) {
            if (await this.store.release(rest.id, this.workerId)) result.released++;
            else result.leaseLost++;
          }
          break;
        }
        continue;
      }

      const ok = await this.store.markPublished(message.id, this.workerId);
      if (ok) {
        result.published++;
        this.logger.log({ event: 'outbox_message_published', ...context });
      } else {
        // Kafka has the record; another worker may re-send it after our lease expired.
        result.leaseLost++;
        this.logger.warn({ event: 'outbox_lease_lost', ...context });
      }
    }
    return result;
  }
}
