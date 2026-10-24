import '../load-env.js';
import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DbModule } from '../db/db.module.js';
import { StatusWorkerModule } from './status-worker.module.js';
import { KafkaEventSourceModule } from './infrastructure/kafka-event-source.module.js';
import { KafkaEventSource } from './infrastructure/kafka-event-source.js';
import { DrizzleRunEventRepository } from './infrastructure/drizzle-run-event.repository.js';

@Module({
  imports: [DbModule, StatusWorkerModule.register({
    imports: [KafkaEventSourceModule],
    eventSource: { useExisting: KafkaEventSource },
    runRepository: { useClass: DrizzleRunEventRepository },
  })],
})
class WorkerApplicationModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerApplicationModule);
  app.enableShutdownHooks();
  new Logger('WorkerBootstrap').log({ event: 'worker_ready' });
}

bootstrap().catch(() => {
  new Logger('WorkerBootstrap').error({ event: 'worker_boot_failed' });
  process.exitCode = 1;
});
