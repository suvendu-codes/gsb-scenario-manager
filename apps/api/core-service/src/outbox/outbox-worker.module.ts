import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';
import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { appConfig } from '../config.js';
import { DbModule } from '../db/db.module.js';
import { OutboxRelay } from './application/outbox-relay.js';
import {
  EVENT_PUBLISHER,
  OUTBOX_STORE,
  OUTBOX_WORKER_ID,
  RELAY_POLICY,
  type RelayPolicy,
} from './application/ports.js';
import { DrizzleOutboxStore } from './infrastructure/drizzle-outbox.store.js';
import { KafkaEventPublisher } from './infrastructure/kafka-event-publisher.js';
import { OUTBOX_WORKER_OPTIONS, OutboxWorker, type OutboxWorkerOptions } from './outbox.worker.js';

export const defaultWorkerId = () => `${hostname()}-${process.pid}-${randomUUID().slice(0, 8)}`;

export interface OutboxWorkerProvidersOptions {
  store: Provider;
  publisher: Provider;
  policy: RelayPolicy;
  worker: OutboxWorkerOptions;
  workerId?: string;
}

/** Shared wiring for the production module and tests (which swap store/publisher). */
export function outboxWorkerProviders(opts: OutboxWorkerProvidersOptions): Provider[] {
  return [
    opts.store,
    opts.publisher,
    { provide: RELAY_POLICY, useValue: opts.policy },
    { provide: OUTBOX_WORKER_ID, useValue: opts.workerId ?? defaultWorkerId() },
    { provide: OUTBOX_WORKER_OPTIONS, useValue: opts.worker },
    OutboxRelay,
    OutboxWorker,
  ];
}

/** Runtime module for the standalone outbox worker process (see worker-main.ts). */
@Module({})
export class OutboxWorkerModule {
  static forRoot(): DynamicModule {
    const { outbox, kafka } = appConfig;
    return {
      module: OutboxWorkerModule,
      imports: [DbModule],
      providers: outboxWorkerProviders({
        store: { provide: OUTBOX_STORE, useClass: DrizzleOutboxStore },
        publisher: {
          provide: EVENT_PUBLISHER,
          useFactory: () =>
            new KafkaEventPublisher({
              brokers: kafka.brokers,
              clientId: `${kafka.clientId}-outbox`,
              ssl: kafka.ssl,
              sasl: kafka.sasl,
            }),
        },
        policy: {
          batchSize: outbox.batchSize,
          leaseMs: outbox.leaseMs,
          backoffBaseMs: outbox.backoffBaseMs,
          backoffMaxMs: outbox.backoffMaxMs,
          maxAttempts: outbox.maxAttempts,
        },
        worker: { pollIntervalMs: outbox.pollIntervalMs, autoStart: true },
      }),
      exports: [OutboxWorker],
    };
  }
}
