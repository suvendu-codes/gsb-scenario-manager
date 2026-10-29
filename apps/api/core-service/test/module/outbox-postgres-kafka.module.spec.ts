/**
 * Module tests against real PostgreSQL and Kafka (docker compose up postgres kafka).
 * Each run creates its own database (initialised by db/schema.sql) and its own topics.
 *
 *   MODULE_TEST_DATABASE_URL=postgresql://scene:scene@localhost:5432/scene \
 *   MODULE_TEST_KAFKA_BROKERS=localhost:9092 pnpm --filter core-service test:outbox-module
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
  CONFIG_SNAPSHOT_STORE,
  ENGINE_GATE,
  EVENT_SCHEMA_VERSION,
  RUN_TRIGGER_REPOSITORY,
  RUN_UPSTREAM,
} from '../../src/runs/application/ports/run-trigger.repository.js';
import { InMemoryConfigSnapshotStore, MockRunUpstream } from '../../src/runs/infrastructure/run-adapters.js';
import { SCENARIO_CONFIG_READER } from '../../src/scenarios/application/ports/scenario-config.reader.js';
import { TriggerScenarioUseCase } from '../../src/runs/application/use-cases/trigger-scenario.use-case.js';
import { RunTriggerEventSchema } from '../../src/runs/domain/run-trigger-event.js';
import { DrizzleRunTriggerRepository } from '../../src/runs/infrastructure/drizzle-run-trigger.repository.js';
import { RunsController } from '../../src/runs/presentation/runs.controller.js';
import { sleep, waitFor } from './support/wait.js';
import { startHttpApp, type HttpApp } from './support/http-app.js';
import {
  collect,
  createTestDatabase,
  createTopics,
  hasInfra,
  infraEnv,
  seedScenario,
  type Received,
  readSchemaSql,
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
        { provide: SCENARIO_CONFIG_READER, useValue: { read: async () => ({}) } },
        { provide: RUN_UPSTREAM, useClass: MockRunUpstream },
        { provide: CONFIG_SNAPSHOT_STORE, useClass: InMemoryConfigSnapshotStore },
        { provide: ENGINE_GATE, useValue: { closed: [] } },
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
  const trigger = (app: HttpApp, scenarioId: string, key: string = randomUUID()) =>
    app.post(`/api/v1/scenarios/${scenarioId}/runs`, triggerBody(), { 'Idempotency-Key': key, 'x-user-email': 'pk@test' });

  beforeAll(async () => {
    database = await createTestDatabase();
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

  it('PK-01 db/schema.sql creates the outbox table and trigger columns', async () => {
    const columns = async (table: string) =>
      (await rows(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
        [table],
      )).map((r) => r.column_name);
    expect(await columns('run_outbox')).toEqual([
      'id', 'scenario_id', 'run_id', 'correlation_id', 'engine', 'event_type', 'command_id', 'sequence',
      'topic', 'message_key', 'payload', 'headers', 'status', 'attempts', 'available_at', 'locked_by',
      'locked_until', 'last_error', 'created_at', 'published_at',
    ]);
    expect(await columns('run')).toEqual(expect.arrayContaining([
      'idempotency_key', 'request_hash', 'priority', 'triggered_by', 'map_version', 'sizer_version', 'config_snapshot_uri',
    ]));
    const constraints = (await rows(
      `SELECT conname FROM pg_constraint WHERE conrelid IN ('public.run'::regclass, 'public.run_outbox'::regclass)`,
    )).map((r) => r.conname);
    expect(constraints).toEqual(expect.arrayContaining([
      'run_scenario_idempotency_key', 'run_outbox_correlation_sequence_key', 'run_outbox_command_enum',
      'run_outbox_status_enum', 'run_outbox_published_consistent', 'run_outbox_run_id_run_id_fk',
    ]));
  });

  it('PK-02 re-running db/schema.sql is a validated no-op; a baseline without run_outbox is refused', async () => {
    const scenarioId = await seedScenario(database.pool);
    await database.pool.query(await readSchemaSql());
    expect(await rows('SELECT id FROM scenario WHERE id = $1', [scenarioId])).toHaveLength(1);

    const partial = await createTestDatabase('empty');
    try {
      await partial.pool.query(await readSchemaSql());
      await partial.pool.query('DROP TABLE run_outbox');
      await expect(partial.pool.query(await readSchemaSql())).rejects.toThrow(/Partial Scenario Manager schema/);
    } finally {
      await partial.drop();
    }
  });

  it('PK-03 trigger → run + outbox in one transaction → worker publishes to Kafka', async () => {
    const scenarioId = await seedScenario(database.pool);
    const app = await startApp();

    const res = await trigger(app, scenarioId);
    expect(res.status).toBe(202);
    const correlationId: string = res.body.correlation_id;
    expect(res.headers.get('location')).toBe(`/v1/runs/${correlationId}`);

    const [run] = await rows('SELECT * FROM run WHERE correlation_id = $1', [correlationId]);
    const runId = run.id;
    expect(run).toMatchObject({
      status: 'trigger_requested',
      pending_command: 'run',
      command_sequence: 1,
      engine: 'emulator',
      priority: 'normal',
      triggered_by: 'pk@test',
      map_version: 'v1',
      sizer_version: 'v1',
    });
    expect(run.config_snapshot_uri).toMatch(new RegExp(`^memory://runs/${scenarioId}/${correlationId}/config.json$`));
    const [scenario] = await rows('SELECT status, current_run_id FROM scenario WHERE id = $1', [scenarioId]);
    expect(scenario).toMatchObject({ status: 'running', current_run_id: runId });

    const [message] = await waitFor(() => {
      const found = delivered(correlationId);
      expect(found).toHaveLength(1);
      return found;
    }, { timeoutMs: 20_000 });
    expect(message.topic).toBe(topics.emulator);
    const event = RunTriggerEventSchema.parse(message.value);
    expect(event.references.scenario_id).toBe(scenarioId);
    expect(event.correlation_id).toBe(correlationId);

    const [row] = await waitFor(async () => {
      const r = await outboxRows();
      expect(r[0].status).toBe('published');
      return r;
    });
    expect(message.headers.event_id).toBe(row.id);
    expect(row.payload).toEqual(message.value);
    expect(row.published_at).toBeInstanceOf(Date);
    expect(row).toMatchObject({ attempts: 1, locked_by: null, last_error: null });
  });

  it('PK-04 a scenario that is not ready gets 422 scenario_invalid and nothing is written', async () => {
    const scenarioId = await seedScenario(database.pool, { ready: false });
    const app = await startApp(false);

    const res = await trigger(app, scenarioId);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('scenario_invalid');
    expect(res.body.error.details.issues.length).toBe(4);
    expect(await rows('SELECT 1 FROM run')).toHaveLength(0);
    expect(await outboxRows()).toHaveLength(0);
    expect((await rows('SELECT status FROM scenario'))[0].status).toBe('draft');
  });

  it('PK-05 concurrent triggers: the scenario lock admits one execution', async () => {
    const scenarioId = await seedScenario(database.pool);
    const app = await startApp(false);

    const results = await Promise.all(
      Array.from({ length: 6 }, () => trigger(app, scenarioId)),
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
        trigger(app, scenarioId, 'retry-me'),
      ),
    );
    expect(results.filter((r) => r.status === 202)).toHaveLength(1);
    expect(results.filter((r) => r.status === 200)).toHaveLength(5);
    expect(new Set(results.map((r) => r.body.correlation_id)).size).toBe(1);
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

    it('PK-15 renewLease extends only the holder\'s lease', async () => {
      const m = await enqueue('cid_renew');
      const store = new DrizzleOutboxStore(database.db);
      await store.claimDue({ workerId: 'w1', limit: 1, leaseMs: 300 });
      await sleep(200);
      expect(await store.renewLease(m.id, 'w1', 2_000)).toBe(true);
      await sleep(250); // past the original lease, inside the renewed one
      expect(await store.claimDue({ workerId: 'w2', limit: 1, leaseMs: 1_000 })).toHaveLength(0);
      expect(await store.renewLease(m.id, 'w2', 2_000)).toBe(false);
    });

    it('PK-16 a dead run.trigger fails the run (trigger_undeliverable) and finishes the scenario', async () => {
      await database.pool.query(`UPDATE scenario SET status = 'running', current_run_id = $1 WHERE id = $2`, [runId, scenarioId]);
      const trigger = await enqueue('cid_store', 1);
      const store = new DrizzleOutboxStore(database.db);
      await store.claimDue({ workerId: 'w', limit: 1, leaseMs: 10_000 });

      expect(await store.markDead(trigger.id, 'w', 'PublishError: not authorized')).toBe(true);

      const [failed] = await rows('SELECT * FROM run WHERE id = $1', [runId]);
      expect(failed).toMatchObject({
        status: 'failed',
        reason: 'trigger_undeliverable',
        status_message: 'PublishError: not authorized',
        pending_command: null,
      });
      expect(failed.completed_at).toBeInstanceOf(Date);
      expect((await rows('SELECT status FROM scenario WHERE id = $1', [scenarioId]))[0].status).toBe('finished');
      // A new trigger is allowed again: the one-active-run index no longer sees this run as active.
      await expect(
        database.pool.query(`INSERT INTO run (correlation_id, scenario_id, engine) VALUES ('cid_next', $1, 'emulator')`, [scenarioId]),
      ).resolves.toBeDefined();
    });

    it('PK-17 a dead row does not fail a run the engine already reported on', async () => {
      await database.pool.query(`UPDATE run SET status = 'accepted', last_event_sequence = 1 WHERE id = $1`, [runId]);
      const trigger = await enqueue('cid_store', 1);
      const store = new DrizzleOutboxStore(database.db);
      await store.claimDue({ workerId: 'w', limit: 1, leaseMs: 10_000 });
      expect(await store.markDead(trigger.id, 'w', 'PublishError: x')).toBe(true);
      expect((await rows('SELECT status FROM run WHERE id = $1', [runId]))[0].status).toBe('accepted');
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
      await waitFor(async () => {
        await relay.runOnce();
        expect((await outboxRows())[0].status).toBe('published');
      }, { timeoutMs: 30_000, intervalMs: 200 });
      await waitFor(() => expect(late.messages.filter((m) => m.key === 'cid_late_topic')).toHaveLength(1), {
        timeoutMs: 20_000,
      });
    } finally {
      await late.stop();
    }
  });

  it('PK-13 two workers draining a burst deliver every event exactly once', async () => {
    const ids = await Promise.all(Array.from({ length: 25 }, () => seedScenario(database.pool)));
    const app = await startApp(false); // API only
    const responses = await Promise.all(ids.map((id) => trigger(app, id)));
    expect(responses.every((r) => r.status === 202)).toBe(true);

    const store = new DrizzleOutboxStore(database.db);
    const relays = ['w1', 'w2'].map((w) => new OutboxRelay(store, newPublisher(), { ...POLICY, batchSize: 4 }, w));
    await Promise.all(publishers.map((p) => p.connect()));
    await waitFor(async () => {
      await Promise.all(relays.map((r) => r.runOnce()));
      const pending = await rows(`SELECT 1 FROM run_outbox WHERE status <> 'published'`);
      expect(pending).toHaveLength(0);
    }, { timeoutMs: 30_000, intervalMs: 10 });

    const correlations = responses.map((r) => r.body.correlation_id as string);
    await waitFor(() => {
      for (const c of correlations) expect(delivered(c)).toHaveLength(1);
    }, { timeoutMs: 20_000 });
  });

  it('PK-14 crash after Kafka ack but before mark-sent: re-sent after lease expiry, never lost', async () => {
    const scenarioId = await seedScenario(database.pool);
    const app = await startApp(false); // API only; relays below play the workers
    const res = await trigger(app, scenarioId);
    expect(res.status).toBe(202);
    const correlationId: string = res.body.correlation_id;

    const leaseMs = 500;
    const store = new DrizzleOutboxStore(database.db);
    const publisher = newPublisher();
    await publisher.connect();

    // Worker 1: claims and publishes, then dies before markPublished commits.
    const [claimed] = await store.claimDue({ workerId: 'w-crash', limit: 1, leaseMs });
    await publisher.publish(claimed);
    await waitFor(() => expect(delivered(correlationId)).toHaveLength(1), { timeoutMs: 20_000 });
    expect((await outboxRows())[0]).toMatchObject({ status: 'pending', locked_by: 'w-crash', attempts: 1 });

    // Worker 2 cannot take the row while the lease holds, then re-sends it once it expires.
    const survivor = new OutboxRelay(store, publisher, { ...POLICY, leaseMs }, 'w-next');
    expect(await survivor.runOnce()).toMatchObject({ claimed: 0 });
    await sleep(leaseMs + 200);
    expect(await survivor.runOnce()).toMatchObject({ claimed: 1, published: 1 });

    const copies = await waitFor(() => {
      const found = delivered(correlationId);
      expect(found).toHaveLength(2);
      return found;
    }, { timeoutMs: 20_000 });
    // Byte-identical duplicate: same key, partition, sequence and payload, so engines can dedupe.
    expect(copies[1].key).toBe(copies[0].key);
    expect(copies[1].partition).toBe(copies[0].partition);
    expect(copies[1].value).toEqual(copies[0].value);
    expect(copies[1].headers.event_id).toBe(copies[0].headers.event_id);
    expect((await outboxRows())[0]).toMatchObject({ status: 'published', attempts: 2 });
  });
});
