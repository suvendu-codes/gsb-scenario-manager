import { Logger, Module } from '@nestjs/common';
import { Kafka, logLevel } from 'kafkajs';
import type { EventConsumer } from './kafka-consumer.port.js';
import { readKafkaConfig, WORKER_KAFKA_CONFIG, type WorkerKafkaConfig } from './kafka.config.js';
import { KafkaEventSource, STATUS_CONSUMER } from './kafka-event-source.js';

@Module({
  providers: [
    { provide: WORKER_KAFKA_CONFIG, useFactory: () => readKafkaConfig() },
    {
      provide: STATUS_CONSUMER,
      inject: [WORKER_KAFKA_CONFIG],
      useFactory: (config: WorkerKafkaConfig): EventConsumer | null => {
        if (!config.enabled) return null;
        const consumer = new Kafka({
          clientId: 'scenario-manager-status-worker',
          brokers: config.brokers,
          ssl: config.ssl,
          ...(config.username && config.password ? {
            sasl: { mechanism: 'plain', username: config.username, password: config.password },
          } : {}),
          connectionTimeout: 10_000,
          requestTimeout: 30_000,
          logLevel: logLevel.NOTHING,
        }).consumer({
          groupId: config.groupId,
          allowAutoTopicCreation: false,
          sessionTimeout: 60_000,
          retry: { restartOnFailure: async () => true },
        });
        // Surface fatal failures without logging connection details or payloads.
        consumer.on(consumer.events.CRASH, ({ payload }) => {
          new Logger('KafkaStatusWorker').error(
            payload.restart ? 'Kafka consumer crashed; restart scheduled' :
              'Kafka consumer stopped; operator intervention required',
          );
        });
        return consumer;
      },
    },
    KafkaEventSource,
  ],
  exports: [KafkaEventSource],
})
export class KafkaEventSourceModule {}
