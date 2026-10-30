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
        // OBSERVABILITY PLAN: capture connect/disconnect, group join/rebalance,
        // assignment, and crash/restart signals through KafkaJS lifecycle events.
        // Proposed metrics: connection/readiness gauges, rebalances_total,
        // crashes_total{restart_scheduled}, and rebalance/recovery-duration seconds.
        // Verify event meanings before treating a connection as processing-ready.
        // Consumer-group offset lag must also come from independent Kafka/platform
        // monitoring so it remains visible when this process is unavailable.
        // Suppress misleading engine-silence alerts during worker/delivery outages;
        // this does not resolve existing run alerts or change execution state.
        // Surface fatal failures without logging connection details or payloads.
        consumer.on(consumer.events.CRASH, ({ payload }) => {
          new Logger('KafkaStatusWorker').error({
            event: payload.restart ? 'kafka_consumer_crashed' : 'kafka_consumer_stopped',
            message: payload.restart
              ? 'Kafka consumer crashed; restart scheduled'
              : 'Kafka consumer stopped; operator intervention required',
            restart_scheduled: payload.restart,
          });
        });
        return consumer;
      },
    },
    KafkaEventSource,
  ],
  exports: [KafkaEventSource],
})
export class KafkaEventSourceModule {}
