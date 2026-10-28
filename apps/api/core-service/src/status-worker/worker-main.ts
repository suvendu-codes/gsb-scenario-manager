import '../load-env.js';
import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DbModule } from '../db/db.module.js';
import { StatusWorkerModule } from './status-worker.module.js';
import { KafkaEventSourceModule } from './infrastructure/kafka-event-source.module.js';
import { KafkaEventSource } from './infrastructure/kafka-event-source.js';
import { DrizzleRunEventRepository } from './infrastructure/drizzle-run-event.repository.js';

/*
 * ENTRY POINT of the STANDALONE worker (a separate process with no HTTP server).
 *
 * How it gets started: `node dist/status-worker/worker-main.js` (the CMD in Dockerfile.local, run
 * by `pnpm local:up`). Node runs this file top to bottom; the last line, `bootstrap()`, is what
 * actually starts everything.
 *
 * What there is to "schedule": nothing. There is no cron job and no polling timer. Once
 * bootstrap() runs, NestJS creates StatusWorker and calls its `onModuleInit()`, which asks the
 * Kafka adapter to subscribe. After that KafkaJS keeps a long-lived connection open and calls our
 * handler once for every message that arrives (push style). The process simply stays alive
 * because that open connection keeps Node's event loop busy.
 *
 * The same worker also runs INSIDE the normal API service: see app.module.ts, which registers the
 * identical StatusWorkerModule. Either way it only starts consuming when STATUS_WORKER_ENABLED=true.
 *
 * Wiring below ("dependency injection"): StatusWorkerModule only knows two abstract slots,
 * "an event source" and "a run repository". Here we choose the real implementations:
 *   - Kafka as the event source   (reads messages)
 *   - PostgreSQL via Drizzle as the repository (saves state)
 * Tests choose different ones (in-memory), which is why the business logic never imports Kafka
 * or the database directly.
 */
@Module({
  imports: [DbModule, StatusWorkerModule.register({
    imports: [KafkaEventSourceModule],
    eventSource: { useExisting: KafkaEventSource },
    runRepository: { useClass: DrizzleRunEventRepository },
  })],
})
class WorkerApplicationModule {}

async function bootstrap() {
  // "Application context" = start Nest's object container WITHOUT an HTTP server. Creating it
  // builds every provider and runs lifecycle hooks, i.e. StatusWorker.onModuleInit() => Kafka subscribe.
  const app = await NestFactory.createApplicationContext(WorkerApplicationModule);
  // On SIGTERM/SIGINT (deploy, Ctrl+C) Nest calls StatusWorker.beforeApplicationShutdown(),
  // which stops Kafka consumption cleanly so the in-flight message finishes first.
  app.enableShutdownHooks();
  new Logger('WorkerBootstrap').log({ event: 'worker_ready' });
}

bootstrap().catch(() => {
  new Logger('WorkerBootstrap').error({ event: 'worker_boot_failed' });
  process.exitCode = 1;
});
