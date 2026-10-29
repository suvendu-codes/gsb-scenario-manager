import { Inject, Injectable, Logger } from '@nestjs/common';
import type { EventConsumer, EventMessage } from './kafka-consumer.port.js';
import type { EventDelivery, EventSource } from '../application/ports/event-source.js';
import { WORKER_KAFKA_CONFIG, type WorkerKafkaConfig } from './kafka.config.js';

export const STATUS_CONSUMER = Symbol('STATUS_CONSUMER');

/**
 * All Kafka subscription/offset semantics stay inside this adapter.
 *
 * THIS IS WHERE EVENTS COME FROM. The engines (emulator / simulator) publish their responses to
 * a Kafka topic (default `run.response`, see kafka.config.ts). This class subscribes to that topic
 * as part of a "consumer group" (KAFKA_GROUP_ID). Kafka remembers, per group, how far we have read
 * (the "committed offset"), so after a restart we continue where we stopped. Several replicas in
 * the same group share the partitions; a different group would receive its own full copy.
 *
 * This service never PUBLISHES anything. It only reads engine responses and writes PostgreSQL.
 * The trigger that starts a run (and publishes the request to the engine) is a different feature
 * and must save the run row BEFORE publishing, otherwise our lookup by correlation ID fails.
 */
@Injectable()
export class KafkaEventSource implements EventSource {
  private readonly logger = new Logger(KafkaEventSource.name);

  constructor(
    @Inject(STATUS_CONSUMER) private readonly consumer: EventConsumer | null,
    @Inject(WORKER_KAFKA_CONFIG) private readonly config: WorkerKafkaConfig,
  ) {}

  async start(handler: (delivery: EventDelivery) => Promise<void>) {
    // OBSERVABILITY PLAN: connect/subscribe latency and failures, consumer readiness,
    // and assigned partition count. Disabled consumption is intentional, not an
    // outage. No recently received event does not prove failure on an idle topic.
    // STATUS_WORKER_ENABLED is not "true": no Kafka client was created (see
    // kafka-event-source.module.ts), so do nothing. This is how the worker is switched off.
    if (!this.consumer) {
      this.logger.log({ event: 'status_worker_disabled' });
      return;
    }
    try {
      // Status and result topics are usually the same topic; the Set removes the duplicate name.
      const topics = [...new Set([this.config.statusTopic, this.config.resultTopic])];
      await this.consumer.connect();
      // fromBeginning only matters for a NEW consumer group (no committed offset yet): it then
      // reads the whole topic history. An existing group always resumes from its committed offset.
      await this.consumer.subscribe({ topics, fromBeginning: true });
      // run() returns as soon as the consumer is started; it keeps polling Kafka in the background.
      // autoCommit:false = KafkaJS must NOT mark messages as read by itself; we do it manually in
      // acknowledge() once the database write succeeded.
      // eachMessage = called for EVERY message, one at a time per partition. If our handler throws
      // (rejected event / DB error) KafkaJS does not move on: it retries, then crashes and restarts the
      // consumer, which redelivers the same message. That is the "blocked partition" behaviour.
      await this.consumer.run({
        autoCommit: false,
        eachMessage: (message) => handler(this.toDelivery(message)),
      });
      this.logger.log({ event: 'event_source_subscribed', source: 'kafka', groupId: this.config.groupId, topics });
    } catch (error) {
      try {
        await this.consumer.disconnect();
      } catch {
        // Preserve the startup failure as the cause the caller must act on.
        this.logger.error({ event: 'event_source_startup_cleanup_failed', source: 'kafka' });
      }
      throw error;
    }
  }

  /** Translate a raw Kafka message into the transport-neutral EventDelivery the worker understands. */
  toDelivery({ topic, partition, message }: EventMessage): EventDelivery {
    return {
      body: message.value,                                   // raw JSON bytes; parsed later by the domain
      context: { topic, partition, offset: message.offset }, // only safe identifiers, used in logs
      // Called by StatusWorker AFTER the database transaction committed.
      acknowledge: async () => {
        // Kafka's committed offset means "the NEXT offset to read", hence offset + 1.
        // BigInt because offsets are 64-bit numbers that can exceed JavaScript's safe integer range.
        // OBSERVABILITY PLAN: offset-commit duration and success/failure counters
        // are owned by this adapter; the worker owns overall handling outcomes.
        // Report committed NEXT offset in logs, but never use offsets as labels.
        // Commit failure after DB success means replay, not a rolled-back update.
        if (!this.consumer) throw new Error('Kafka consumer is disabled');
        await this.consumer.commitOffsets([{
          topic, partition, offset: (BigInt(message.offset) + 1n).toString(),
        }]);
      },
    };
  }

  async stop() {
    // OBSERVABILITY PLAN: separate stop/drain errors from disconnect errors;
    // expose enough stage context to diagnose termination without connection
    // strings or raw Kafka exception objects in logs.
    if (!this.consumer) return;
    try { await this.consumer.stop(); }
    finally { await this.consumer.disconnect(); }
  }
}
