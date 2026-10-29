/**
 * Module tests against real PostgreSQL and Kafka (docker compose up postgres kafka).
 * Each run creates its own database (via the drizzle migrations) and its own topics.
 *
 *   MODULE_TEST_DATABASE_URL=postgresql://scene:scene@localhost:5432/scene \
 *   MODULE_TEST_KAFKA_BROKERS=localhost:9092 pnpm --filter core-service test:module
 */
import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { triggerBody } from '../fixtures/trigger.js';
import { DRIZZLE } from '../../src/db/db.constants.js';
import { OutboxRelay } from '../../src/outbox/application/outbox-relay.js';
import { EVENT_PUBLISHER, OUTBOX_STORE, type RelayPolicy } from '../../src/outbox/application/ports.js';
import { createOutboxMessage } from '../../src/outbox/domain/outbox-message.js';
import { DrizzleOutboxStore } from '../../src/outbox/infrastructure/drizzle-outbox.store.js';
import { KafkaEventPublisher } from '../../src/outbox/infrastructure/kafka-event-publisher.js';
import { insertOutboxMessage } from '../../src/outbox/infrastructure/outbox-writer.js';
import { outboxWorkerProviders } from '../../src/outbox/outbox-worker.module.js';
import {
  COMMAND_TOPICS,
  EVENT_SCHEMA_VERSION,
  RUN_TRIGGER_REPOSITORY,
} from '../../src/runs/application/ports/run-trigger.repository.js';
import { TriggerScenarioUseCase } from '../../src/runs/application/use-cases/trigger-scenario.use-case.js';
import { RunTriggerEventSchema } from '../../src/runs/domain/run-trigger-event.js';
import { DrizzleRunTriggerRepository } from '../../src/runs/infrastructure/drizzle-run-trigger.repository.js';
import { RunsController } from '../../src/runs/presentation/runs.controller.js';
import { eventually, sleep } from './support/eventually.js';
import { startHttpApp, type HttpApp } from './support/http-app.js';
import {
  collect,
  createTestDatabase,
  createTopics,
  hasInfra,
  infraEnv,
  seedScenario,
  type Received,
  type TestDatabase,
} from './support/infra.js';

const POLICY: RelayPolicy = { batchSize: 20, leaseMs: 10_000, backoffBaseMs: 100, backoffMaxMs: 500, maxAttempts: 0 };

describe.skipIf(!hasInfra)('Outbox with PostgreSQL + Kafka (module)', () => {
  const suffix = randomUUID().slice(0, 8);
  const topics = { emulator: `mt.${suffix}.emulator.commands`, simulator: `mt.${suffix}.simulator.commands` };
  let database: TestDatabase;
  let consumer: { messages: Received[]; stop: () => Promise<void> };
  let http: HttpApp | undefined;
  const publishers: KafkaEventPublisher[] = [];

  const newPublisher = () => {
    const p = new KafkaEventPublisher({
      brokers: infraEnv.kafkaBrokers!,
      clientId: `mt-outbox-${suffix}`,
      ssl: false,
      sasl: { mechanism: 'plain' },
      sendTimeoutMs: 5_000,
    });
    publishers.push(p);
    return p;
  };

  async function startApp(autoStart = true) {
    @Module({
      controllers: [RunsController],
      providers: [
        { provide: DRIZZLE, useValue: database.db },
        TriggerScenarioUseCase,
        { provide: RUN_TRIGGER_REPOSITORY, useClass: DrizzleRunTriggerRepository },
        { provide: COMMAND_TOPICS, useValue: topics },
        { provide: EVENT_SCHEMA_VERSION, useValue: '1.1' },
        ...outboxWorkerProviders({
          store: { provide: OUTBOX_STORE, useClass: DrizzleOutboxStore },
          publisher: { provide: EVENT_PUBLISHER, useFactory: newPublisher },
          policy: POLICY,
          worker: { pollIntervalMs: 50, autoStart },
          workerId: `mt-app-${suffix}`,
        }),
      ],
    })
    class PgKafkaTestModule {}
    http = await startHttpApp(PgKafkaTestModule);
    return http;
  }

  const rows = async (sql: string, params: unknown[] = []) => (await database.pool.query(sql, params)).rows;
  const outboxRows = () => rows('SELECT * FROM run_outbox ORDER BY created_at, sequence');
  const delivered = (correlationId: string) => consumer.messages.filter((m) => m.key === correlationId);

  beforeAll(async () => {
    database = await createTestDatabase('migrations');
    await createTopics([topics.emulator, topics.simulator]);
    consumer = await collect([topics.emulator, topics.simulator]);
  });

  afterAll(async () => {
    await consumer?.stop();
    await database?.drop();
  });

  beforeEach(async () => {
    await database.pool.query('TRUNCATE run_outbox, run, scenario');
  });

  afterEach(async () => {
    await http?.close();
    http = undefined;
    await Promise.all(publishers.splice(0).map((p) => p.disconnect()));
  });

  it('PK-01 migrations create the outbox schema', async () => {
    const enumValues = async (type: string) =>
      (await rows(
        `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = $1 ORDER BY e.enumsortorder`,
        [type],
      )).map((r) => r.enumlabel);

    expect(await enumValues('scenario_status')).toEqual(['draft', 'running', 'paused', 'finished']);
    expect(await enumValues('run_status')).toContain('trigger_requested');
    expect(await enumValues('outbox_status')).toEqual(['pending', 'published', 'dead']);
    const columns = (await rows(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'run_outbox' ORDER BY ordinal_position`,
    )).map((r) => r.column_name);
    expect(columns).toEqual([
      'id', 'scenario_id', 'run_id', 'correlation_id', 'engine', 'event_type', 'command_id', 'sequence',
      'topic', 'message_key', 'payload', 'headers', 'status', 'attempts', 'available_at', 'locked_by',
      'locked_until', 'last_error', 'created_at', 'published_at',
    ]);
  });

  it('PK-02 db/schema.sql (fresh init) produces the same tables as the migrations', async () => {
    const fresh = await createTestDatabase('schema.sql');
    try {
      const shape = async (pool: TestDatabase['pool']) =>
        (await pool.query(
          `SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name IN ('scenario', 'run', 'run_outbox')
           ORDER BY table_name, column_name`,
        )).rows;
      const indexes = async (pool: TestDatabase['pool']) =>
        (await pool.query(
          `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('scenario','run','run_outbox') ORDER BY indexname`,
        )).rows.map((r) => r.indexname);
      expect(await shape(fresh.pool)).toEqual(await shape(database.pool));
      expect(await indexes(fresh.pool)).toEqual(await indexes(database.pool));
    } finally {
      await fresh.drop();
    }
  });

  it('PK-03 trigger → run + outbox in one transaction → worker publishes to Kafka', async () => {
    const scenarioId = await seedScenario(database.pool);
    const app = await startApp();

    const res = await app.post(`/api/v1/scenarios/${scenarioId}/trigger`, triggerBody());
    expect(res.status).toBe(202);
    const { correlationId, runId } = res.body;

    const [run] = await rows('SELECT * FROM run WHERE id = $1', [runId]);
    expect(run).toMatchObject({
      correlation_id: correlationId,
      status: 'trigger_requested',
      pending_command: 'run',
      command_sequence: 1,
      engine: 'emulator',
    });
    const [scenario] = await rows('SELECT status FROM scenario WHERE id = $1', [scenarioId]);
    expect(scenario.status).toBe('running');

    const [message] = await eventually(() => {
      const found = delivered(correlationId);
      expect(found).toHaveLength(1);
      return found;
    }, { timeoutMs: 20_000 });
    expect(message.topic).toBe(topics.emulator);
    const event = RunTriggerEventSchema.parse(message.value);
    expect(event.references.scenario_id).toBe(scenarioId);
    expect(event.correlation_id).toBe(correlationId);

    const [row] = await eventually(async () => {
      const r = await outboxRows();
      expect(r[0].status).toBe('published');
      return r;
    });
    expect(message.headers.event_id).toBe(row.id);
    expect(row.payload).toEqual(message.value);
    expect(row.published_at).toBeInstanceOf(Date);
    expect(row).toMatchObject({ attempts: 1, locked_by: null, last_error: null });
  });

  it('PK-04 a rejected trigger leaves no run, no outbox row and the scenario in draft', async () => {
    const scenarioId = await seedScenario(database.pool, { outboundUri: 'gs://another-bucket/o.csv' });
    const app = await startApp(false);

    const res = await app.post(`/api/v1/scenarios/${scenarioId}/trigger`, triggerBody());
    expect(res.status).toBe(400);
    expect(await rows('SELECT 1 FROM run')).toHaveLength(0);
    expect(await outboxRows()).toHaveLength(0);
    expect((await rows('SELECT status FROM scenario'))[0].status).toBe('draft');
  });

  it('PK-05 concurrent triggers: the scenario lock admits one execution', async () => {
    const scenarioId = await seedScenario(database.pool);
    const app = await startApp(false);

    const results = await Promise.all(
      Array.from({ length: 6 }, () => app.post(`/api/v1/scenarios/${scenarioId}/trigger`, triggerBody())),
    );
    expect(results.filter((r) => r.status === 202)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(5);
    expect(await rows('SELECT 1 FROM run')).toHaveLength(1);
    expect(await outboxRows()).toHaveLength(1);
  });

  it('PK-06 concurrent retries with one Idempotency-Key create one execution', async () => {
    const scenarioId = await seedScenario(database.pool);
    const app = await startApp(false);

    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        app.post(`/api/v1/scenarios/${scenarioId}/trigger`, triggerBody(), { 'Idempotency-Key': 'retry-me' }),
      ),
    );
    expect(results.every((r) => r.status === 202)).toBe(true);
    expect(new Set(results.map((r) => r.body.runId)).size).toBe(1);
    expect(results.filter((r) => r.body.replayed === false)).toHaveLength(1);
    expect(await outboxRows()).toHaveLength(1);
  });

  it('PK-07 the database rejects a second active run and duplicate command sequences', async () => {
    const scenarioId = await seedScenario(database.pool);
    const insertRun = (status: string) =>
      database.pool.query(
        `INSERT INTO run (correlation_id, scenario_id, engine, status) VALUES ($1, $2, 'emulator', $3) RETURNING id`,
        [`cid_${randomUUID()}`, scenarioId, status],
      );
    await insertRun('completed');
    const { rows: [active] } = await insertRun('trigger_requested');
    await expect(insertRun('running')).rejects.toMatchObject({ code: '23505', constraint: 'run_one_active_per_scenario' });

    const draft = (sequence: number) =>
      createOutboxMessage({
        id: randomUUID(),
        scenarioId,
        runId: active.id,
        topic: topics.emulator,
        event: { event_type: 'run.trigger', command_id: 'run', engine: 'emulator', sequence, correlation_id: 'cid_dup' },
      });
    await insertOutboxMessage(database.db, draft(1));
    await expect(insertOutboxMessage(database.db, draft(1))).rejects.toMatchObject({
      cause: expect.objectContaining({ code: '23505', constraint: 'run_outbox_correlation_sequence_key' }),
    });
    await expect(
      database.pool.query(`UPDATE run_outbox SET status = 'published'`),
    ).rejects.toMatchObject({ code: '23514', constraint: 'run_outbox_published_consistent' });
  });

  describe('DrizzleOutboxStore', () => {
    let scenarioId: string;
    let runId: string;

    const enqueue = async (correlationId: string, sequence = 1) => {
      const draft = createOutboxMessage({
        id: randomUUID(),
        scenarioId,
        runId,
        topic: topics.emulator,
        event: {
          event_type: sequence === 1 ? 'run.trigger' : 'run.pause',
          command_id: sequence === 1 ? 'run' : 'pause',
          engine: 'emulator',
          sequence,
          correlation_id: correlationId,
        },
      });
      await insertOutboxMessage(database.db, draft);
      return draft;
    };

    beforeEach(async () => {
      scenarioId = await seedScenario(database.pool);
      runId = (await rows(
        `INSERT INTO run (correlation_id, scenario_id, engine, status) VALUES ('cid_store', $1, 'emulator', 'trigger_requested') RETURNING id`,
        [scenarioId],
      ))[0].id;
    });

    it('PK-08 SKIP LOCKED: concurrent workers claim disjoint rows', async () => {
      for (let i = 0; i < 30; i++) await enqueue(`cid_${i}`);
      const a = new DrizzleOutboxStore(database.db);
      const b = new DrizzleOutboxStore(database.db);
      const [ca, cb] = await Promise.all([
        a.claimDue({ workerId: 'wa', limit: 20, leaseMs: 10_000 }),
        b.claimDue({ workerId: 'wb', limit: 20, leaseMs: 10_000 }),
      ]);
      const ids = [...ca, ...cb].map((m) => m.id);
      expect(ids).toHaveLength(30);
      expect(new Set(ids).size).toBe(30);
      expect(await a.claimDue({ workerId: 'wc', limit: 20, leaseMs: 10_000 })).toHaveLength(0);
    });

    it('PK-09 per-execution order: sequence 2 waits until sequence 1 is published', async () => {
      const s1 = await enqueue('cid_order', 1);
      await enqueue('cid_order', 2);
      const store = new DrizzleOutboxStore(database.db);

      const first = await store.claimDue({ workerId: 'w', limit: 10, leaseMs: 10_000 });
      expect(first.map((m) => m.sequence)).toEqual([1]);
      expect(await store.markRetry(s1.id, 'w', 'down', 0)).toBe(true);
      // still unpublished → seq 2 stays blocked, seq 1 is due again
      expect((await store.claimDue({ workerId: 'w', limit: 10, leaseMs: 10_000 })).map((m) => m.sequence)).toEqual([1]);
      expect(await store.markPublished(s1.id, 'w')).toBe(true);
      expect((await store.claimDue({ workerId: 'w', limit: 10, leaseMs: 10_000 })).map((m) => m.sequence)).toEqual([2]);
    });

    it('PK-10 an expired lease is reclaimed and the old holder can no longer write', async () => {
      const m = await enqueue('cid_lease');
      const store = new DrizzleOutboxStore(database.db);
      expect(await store.claimDue({ workerId: 'slow', limit: 1, leaseMs: 200 })).toHaveLength(1);
      expect(await store.claimDue({ workerId: 'fast', limit: 1, leaseMs: 10_000 })).toHaveLength(0);
      await sleep(300);
      const [again] = await store.claimDue({ workerId: 'fast', limit: 1, leaseMs: 10_000 });
      expect(again).toMatchObject({ id: m.id, attempts: 2 });
      expect(await store.markPublished(m.id, 'slow')).toBe(false);
      expect(await store.markPublished(m.id, 'fast')).toBe(true);
    });

    it('PK-11 retry backoff, dead and release bookkeeping', async () => {
      const r1 = await enqueue('cid_r1');
      const r2 = await enqueue('cid_r2');
      const r3 = await enqueue('cid_r3');
      const store = new DrizzleOutboxStore(database.db);
      await store.claimDue({ workerId: 'w', limit: 10, leaseMs: 10_000 });

      expect(await store.markRetry(r1.id, 'w', 'PublishError: down', 60_000)).toBe(true);
      expect(await store.markDead(r2.id, 'w', 'PublishError: too large')).toBe(true);
      expect(await store.release(r3.id, 'w')).toBe(true);

      const byId = Object.fromEntries((await outboxRows()).map((r) => [r.id, r]));
      expect(byId[r1.id]).toMatchObject({ status: 'pending', attempts: 1, last_error: 'PublishError: down', locked_by: null });
      expect(byId[r1.id].available_at.getTime()).toBeGreaterThan(Date.now() + 50_000);
      expect(byId[r2.id]).toMatchObject({ status: 'dead', last_error: 'PublishError: too large' });
      expect(byId[r3.id]).toMatchObject({ status: 'pending', attempts: 0, locked_by: null });

      const next = await store.claimDue({ workerId: 'w', limit: 10, leaseMs: 10_000 });
      expect(next.map((m) => m.id)).toEqual([r3.id]);
    });
  });

  it('PK-12 relay retries a missing topic and delivers once the topic exists', async () => {
    const scenarioId = await seedScenario(database.pool);
    const runId = (await rows(
      `INSERT INTO run (correlation_id, scenario_id, engine, status) VALUES ('cid_late_topic', $1, 'emulator', 'trigger_requested') RETURNING id`,
      [scenarioId],
    ))[0].id;
    const lateTopic = `mt.${suffix}.late.commands`;
    await insertOutboxMessage(
      database.db,
      createOutboxMessage({
        id: randomUUID(),
        scenarioId,
        runId,
        topic: lateTopic,
        event: { event_type: 'run.trigger', command_id: 'run', engine: 'emulator', sequence: 1, correlation_id: 'cid_late_topic' },
      }),
    );

    const publisher = newPublisher();
    await publisher.connect();
    const relay = new OutboxRelay(new DrizzleOutboxStore(database.db), publisher, { ...POLICY, backoffBaseMs: 10, backoffMaxMs: 10 }, 'mt-relay');

    expect(await relay.runOnce()).toMatchObject({ claimed: 1, retried: 1, dead: 0 });
    const [pending] = await outboxRows();
    expect(pending.status).toBe('pending');
    expect(pending.last_error).toMatch(/PublishError/);

    await createTopics([lateTopic]);
    const late = await collect([lateTopic]);
    try {
      await eventually(async () => {
        await relay.runOnce();
        expect((await outboxRows())[0].status).toBe('published');
      }, { timeoutMs: 30_000, intervalMs: 200 });
      await eventually(() => expect(late.messages.filter((m) => m.key === 'cid_late_topic')).toHaveLength(1), {
        timeoutMs: 20_000,
      });
    } finally {
      await late.stop();
    }
  });

  it('PK-13 two workers draining a burst deliver every event exactly once', async () => {
    const ids = await Promise.all(Array.from({ length: 25 }, () => seedScenario(database.pool)));
    const app = await startApp(false); // API only
    const responses = await Promise.all(ids.map((id) => app.post(`/api/v1/scenarios/${id}/trigger`, triggerBody())));
    expect(responses.every((r) => r.status === 202)).toBe(true);

    const store = new DrizzleOutboxStore(database.db);
    const relays = ['w1', 'w2'].map((w) => new OutboxRelay(store, newPublisher(), { ...POLICY, batchSize: 4 }, w));
    await Promise.all(publishers.map((p) => p.connect()));
    await eventually(async () => {
      await Promise.all(relays.map((r) => r.runOnce()));
      const pending = await rows(`SELECT 1 FROM run_outbox WHERE status <> 'published'`);
      expect(pending).toHaveLength(0);
    }, { timeoutMs: 30_000, intervalMs: 10 });

    const correlations = responses.map((r) => r.body.correlationId as string);
    await eventually(() => {
      for (const c of correlations) expect(delivered(c)).toHaveLength(1);
    }, { timeoutMs: 20_000 });
  });
});
