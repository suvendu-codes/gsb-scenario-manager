import '../load-env.js';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { OutboxWorkerModule } from './outbox-worker.module.js';
import { JsonLogger } from '../telemetry/json-logger.js';

/**
 * Standalone outbox worker: `node dist/outbox/worker-main.js`.
 * Deploy separately from the API; any number of replicas may run (rows are leased with
 * FOR UPDATE SKIP LOCKED). SIGTERM/SIGINT drain the in-flight batch before exiting.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(OutboxWorkerModule.forRoot(), {
    logger: new JsonLogger(),
  });
  app.enableShutdownHooks();
  new Logger('OutboxWorkerMain').log('Outbox worker running');
}

bootstrap().catch((error: unknown) => {
  new Logger('OutboxWorkerMain').error(
    `Outbox worker failed to start: ${error instanceof Error ? error.message : String(error)}`,
    error instanceof Error ? error.stack : undefined,
  );
  process.exit(1);
});
