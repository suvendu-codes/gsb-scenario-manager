import '../../src/load-env.js';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { z } from 'zod';
import { appConfig } from '../../src/config.js';
import * as schema from '../../src/db/schema/index.js';
import { ProcessRunEventUseCase } from '../../src/status-worker/application/process-run-event.use-case.js';
import { runEventSchema } from '../../src/status-worker/domain/run-event.js';
import { DrizzleRunEventRepository } from '../../src/status-worker/infrastructure/drizzle-run-event.repository.js';
import { InMemoryRunEventRepository } from '../../src/status-worker/infrastructure/in-memory-run-event.repository.js';
import { readKafkaConfig } from '../../src/status-worker/infrastructure/kafka.config.js';
import { StatusWorker } from '../../src/status-worker/application/status-worker.js';
import { KafkaEventSource } from '../../src/status-worker/infrastructure/kafka-event-source.js';
import { MockEventConsumer } from '../../src/status-worker/infrastructure/mock-event-consumer.js';

async function main() {
  if (appConfig.env === 'production') throw new Error('Mock runner is disabled in production');
  const { values } = parseArgs({ options: {
    database: { type: 'boolean', default: false },
    file: { type: 'string', default: 'test/fixtures/run-events.json' },
  } });
  const input: unknown = JSON.parse(await readFile(values.file, 'utf8'));
  const events = z.array(runEventSchema).min(1).parse(input);
  const config = readKafkaConfig({});
  const consumer = new MockEventConsumer();
  // Only the demo seeds a row. Database replay requires an existing real run.
  const memory = new InMemoryRunEventRepository([{
    id: '00000000-0000-4000-8000-000000000001',
    scenarioId: '00000000-0000-4000-8000-000000000002',
    correlationId: 'mock-correlation-1', engine: 'emulator', engineRunId: null,
    pendingCommand: null, commandSequence: null, decision: null, commandReason: null,
    lastEventSequence: 0, recoveryRequired: false, heartbeatEmittedAt: null, heartbeatReceivedAt: null, progress: null,
    status: 'trigger_requested', verdict: null, reason: null, results: {}, engineRef: null,
    statusMessage: null, statusEventAt: null, resultEventAt: null,
    completedAt: null, createdAt: new Date(), updatedAt: new Date(),
  }], [{ id: '00000000-0000-4000-8000-000000000002', currentRunId: '00000000-0000-4000-8000-000000000001', status: 'running' }]);
  const pool = values.database ? new Pool({
    connectionString: appConfig.db.url, max: 1,
    connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000,
  }) : undefined;
  pool?.on('error', () => { console.error('Mock runner database connection error'); });
  const repository = pool
    ? new DrizzleRunEventRepository(drizzle(pool, { schema })) : memory;
  const worker = new StatusWorker(new KafkaEventSource(consumer, config), new ProcessRunEventUseCase(repository));
  const logger = new Logger('MockProducer');
  logger.log({ event: 'mock_replay_starting', transport: 'in-process-mock', storage: pool ? 'postgres' : 'memory' });
  try {
    await worker.onModuleInit();
    for (const event of events) {
      const topic = event.event_type === 'run.status' ? config.statusTopic : config.resultTopic;
      consumer.enqueue(topic, Buffer.from(JSON.stringify(event)));
      logger.log({ event: 'mock_event_enqueued', topic, eventType: event.event_type, correlationId: event.correlation_id });
    }
    await consumer.drain();
    console.info(JSON.stringify({
      mode: pool ? 'mock-kafka-with-postgres' : 'fully-in-memory',
      delivered: events.length,
      committedOffsets: {
        [config.statusTopic]: consumer.committedOffset(config.statusTopic),
        [config.resultTopic]: consumer.committedOffset(config.resultTopic),
      },
      ...(pool ? {} : { runs: memory.snapshot(), scenarios: memory.scenarioSnapshot() }),
    }, null, 2));
  } finally {
    try { await worker.beforeApplicationShutdown(); }
    finally { await pool?.end(); }
  }
}

main().catch((error: unknown) => {
  // Avoid printing database error objects, payloads, or credentials.
  console.error(`Mock replay failed (${error instanceof Error ? error.name : 'unknown error'}). Check the input file, correlation IDs, and database configuration.`);
  process.exitCode = 1;
});
