import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { RecordMetadata } from 'kafkajs';
import { localResources } from '../../../tools/local/local-resources.js';
import * as schema from '../../../src/db/schema/index.js';
import type { RunEvent } from '../../../src/status-worker/domain/run-event.js';
import { KafkaEventSource } from '../../../src/status-worker/infrastructure/kafka-event-source.js';
import type { EventConsumer } from '../../../src/status-worker/infrastructure/kafka-consumer.port.js';
import { DrizzleRunEventRepository } from '../../../src/status-worker/infrastructure/drizzle-run-event.repository.js';
import { ProcessRunEventUseCase } from '../../../src/status-worker/application/process-run-event.use-case.js';
import { StatusWorker } from '../../../src/status-worker/application/status-worker.js';
import type { EventDelivery } from '../../../src/status-worker/application/ports/event-source.js';

export type Fixture = { scenarioId: string; id: string; correlationId: string; engineId: string; engine: 'emulator' | 'simulator' };

export async function eventually(check: () => Promise<boolean>, description: string) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(100);
  }
  assert.fail(`Timed out: ${description}`);
}

export class WorkerHarness {
  readonly resources = localResources();
  readonly db = drizzle(this.resources.pool, { schema });
  readonly admin = this.resources.kafka.admin();
  readonly producer = this.resources.kafka.producer({ allowAutoTopicCreation: false });
  private clock = Date.now();
  now() { return new Date(++this.clock).toISOString(); }

  async start() {
    await this.admin.connect();
    await this.producer.connect();
  }

  async close() {
    try { await this.producer.disconnect(); }
    finally {
      try { await this.admin.disconnect(); }
      finally { await this.resources.pool.end(); }
    }
  }

  async fixture(engine: Fixture['engine'] = 'emulator'): Promise<Fixture> {
    const fixture = { scenarioId: randomUUID(), id: randomUUID(), correlationId: randomUUID(), engineId: randomUUID(), engine };
    const client = await this.resources.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO scenario (id,name,project_id,map_id,author_id,status)
        VALUES ($1,$2,'module-test',$2,'module-test','running')`, [fixture.scenarioId, randomUUID()]);
      await client.query(`INSERT INTO run (id,correlation_id,scenario_id,engine) VALUES ($1,$2,$3,$4)`,
        [fixture.id, fixture.correlationId, fixture.scenarioId, engine]);
      await client.query('UPDATE scenario SET current_run_id=$1 WHERE id=$2', [fixture.id, fixture.scenarioId]);
      await client.query('COMMIT');
      return fixture;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  status(f: Fixture, status: Extract<RunEvent, { event_type: 'run.status' }>['status'], emittedAt = this.now()): RunEvent {
    return { event_type: 'run.status', correlation_id: f.correlationId, run_id: f.engineId, engine: f.engine, emitted_at: emittedAt, status };
  }

  result(f: Fixture, status: Extract<RunEvent, { event_type: 'run.result' }>['status'] = 'success', emittedAt = this.now(),
    results: Extract<RunEvent, { event_type: 'run.result' }>['results'] = { marker: randomUUID() }): RunEvent {
    return { event_type: 'run.result', correlation_id: f.correlationId, run_id: f.engineId, engine: f.engine, emitted_at: emittedAt, status, results };
  }

  async run(f: Fixture) {
    const [saved] = await this.db.select().from(schema.run).where(eq(schema.run.id, f.id));
    assert.ok(saved, 'Fixture run must exist');
    return saved;
  }

  async scenario(f: Fixture) {
    const [saved] = await this.db.select().from(schema.scenario).where(eq(schema.scenario.id, f.scenarioId));
    assert.ok(saved, 'Fixture scenario must exist');
    return saved;
  }

  async send(value: unknown, topic = this.resources.config.statusTopic) {
    return this.producer.send({ topic, acks: -1,
      messages: [{ key: 'module-test', value: JSON.stringify(value) }] });
  }

  async acknowledged(sent: RecordMetadata[], groupId = this.resources.config.groupId) {
    await eventually(async () => {
      const offsets = await this.admin.fetchOffsets({ groupId, topics: [...new Set(sent.map((m) => m.topicName))] });
      return sent.every((m) => {
        const offset = offsets.find((t) => t.topic === m.topicName)?.partitions.find((p) => p.partition === m.partition)?.offset;
        return offset !== undefined && m.baseOffset !== undefined && BigInt(offset) > BigInt(m.baseOffset);
      });
    }, 'successful event must be persisted and acknowledged');
  }

  async apply(event: RunEvent) {
    const topic = event.event_type === 'run.result' ? this.resources.config.resultTopic : this.resources.config.statusTopic;
    await this.acknowledged(await this.send(event, topic));
  }

  // Independent real consumer/topics prevent poison events from blocking the standalone worker.
  // Automatic crash restarts are disabled here so rejected deliveries can be inspected deterministically.
  async isolated({ failFirstCommit = false, separateTopics = false, groupId = randomUUID(), topics }: {
    failFirstCommit?: boolean; separateTopics?: boolean; groupId?: string; topics?: string[];
  } = {}) {
    const names = topics ?? (separateTopics ? [randomUUID(), randomUUID()] : [randomUUID()]);
    if (!topics) await this.admin.createTopics({ waitForLeaders: true,
      topics: names.map((topic) => ({ topic, numPartitions: 1, replicationFactor: 1 })) });
    const consumer = this.resources.kafka.consumer({ groupId, allowAutoTopicCreation: false,
      sessionTimeout: 6_000, heartbeatInterval: 2_000,
      retry: { retries: 0, restartOnFailure: async () => false } });
    let crashes = 0;
    consumer.on(consumer.events.CRASH, () => { crashes++; });
    let commits = 0;
    const client: EventConsumer = {
      connect: () => consumer.connect(), subscribe: (options) => consumer.subscribe(options),
      run: (options) => consumer.run({ ...options, partitionsConsumedConcurrently: separateTopics ? 2 : 1 }),
      stop: () => consumer.stop(), disconnect: () => consumer.disconnect(),
      commitOffsets: async (offsets) => {
        if (failFirstCommit && commits++ === 0) throw new Error('Injected offset commit failure');
        await consumer.commitOffsets(offsets);
      },
    };
    const config = { ...this.resources.config, enabled: true, groupId, statusTopic: names[0], resultTopic: names[1] ?? names[0] };
    const source = new KafkaEventSource(client, config);
    const deliveries: Array<EventDelivery['context']> = [];
    const worker = new StatusWorker({
      start: (handler) => source.start((delivery) => {
        deliveries.push(delivery.context);
        return handler(delivery);
      }),
      stop: () => source.stop(),
    },
      new ProcessRunEventUseCase(new DrizzleRunEventRepository(this.db)));
    try { await worker.onModuleInit(); }
    catch (error) { await consumer.disconnect(); throw error; }
    return {
      groupId, topics: names, deliveries,
      send: (value: string | null) => this.producer.send({ topic: names[0], acks: -1, messages: [{ value }] }),
      waitForFailure: () => eventually(async () => crashes > 0, 'consumer must reject the event and stop'),
      assertUnacknowledged: async (sent: RecordMetadata[]) => {
        const offsets = await this.admin.fetchOffsets({ groupId, topics: names });
        for (const m of sent) {
          const offset = offsets.find((t) => t.topic === m.topicName)?.partitions.find((p) => p.partition === m.partition)?.offset;
          assert.ok(offset !== undefined && m.baseOffset !== undefined);
          assert.ok(BigInt(offset) <= BigInt(m.baseOffset), 'Rejected event must remain uncommitted');
        }
      },
      stop: () => worker.beforeApplicationShutdown(),
    };
  }
}
