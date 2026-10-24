import { Inject, Injectable, Logger } from '@nestjs/common';
import type { EventConsumer, EventMessage } from './kafka-consumer.port.js';
import type { EventDelivery, EventSource } from '../application/ports/event-source.js';
import { WORKER_KAFKA_CONFIG, type WorkerKafkaConfig } from './kafka.config.js';

export const STATUS_CONSUMER = Symbol('STATUS_CONSUMER');

/** All Kafka subscription/offset semantics stay inside this adapter. */
@Injectable()
export class KafkaEventSource implements EventSource {
  private readonly logger = new Logger(KafkaEventSource.name);

  constructor(
    @Inject(STATUS_CONSUMER) private readonly consumer: EventConsumer | null,
    @Inject(WORKER_KAFKA_CONFIG) private readonly config: WorkerKafkaConfig,
  ) {}

  async start(handler: (delivery: EventDelivery) => Promise<void>) {
    if (!this.consumer) {
      this.logger.log({ event: 'status_worker_disabled' });
      return;
    }
    try {
      const topics = [...new Set([this.config.statusTopic, this.config.resultTopic])];
      await this.consumer.connect();
      await this.consumer.subscribe({ topics, fromBeginning: true });
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

  toDelivery({ topic, partition, message }: EventMessage): EventDelivery {
    return {
      body: message.value,
      context: { topic, partition, offset: message.offset },
      acknowledge: async () => {
        if (!this.consumer) throw new Error('Kafka consumer is disabled');
        await this.consumer.commitOffsets([{
          topic, partition, offset: (BigInt(message.offset) + 1n).toString(),
        }]);
      },
    };
  }

  async stop() {
    if (!this.consumer) return;
    try { await this.consumer.stop(); }
    finally { await this.consumer.disconnect(); }
  }
}
