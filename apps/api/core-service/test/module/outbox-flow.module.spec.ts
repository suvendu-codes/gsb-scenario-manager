/**
 * In-process module tests: real HTTP controller, error filter, trigger use case, event builder,
 * outbox relay and worker loop, wired through Nest like production. PostgreSQL, Kafka, blob storage
 * and upstream are replaced by in-memory adapters with the same semantics, so no Docker is needed.
 * The PostgreSQL + Kafka suite (outbox-postgres-kafka.module.spec.ts) covers the real adapters.
 */
import { Module } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  MAP_ID,
  PROJECT_ID,
  SCENARIO_ID,
  TOPICS,
  USER,
  scenarioSeed,
  sequentialIds,
  triggerBody,
} from '../fixtures/trigger.js';
import { EVENT_PUBLISHER, OUTBOX_STORE, type RelayPolicy } from '../../src/outbox/application/ports.js';
import { InMemoryOutboxStore } from '../../src/outbox/infrastructure/in-memory-outbox.store.js';
import { outboxWorkerProviders } from '../../src/outbox/outbox-worker.module.js';
import { OutboxWorker } from '../../src/outbox/outbox.worker.js';
import {
  CLOCK,
  COMMAND_TOPICS,
  CONFIG_SNAPSHOT_STORE,
  ENGINE_GATE,
  EVENT_SCHEMA_VERSION,
  ID_GENERATOR,
  RUN_TRIGGER_REPOSITORY,
  RUN_UPSTREAM,
} from '../../src/runs/application/ports/run-trigger.repository.js';
import { TriggerScenarioUseCase } from '../../src/runs/application/use-cases/trigger-scenario.use-case.js';
import { RunTriggerEventSchema } from '../../src/runs/domain/run-trigger-event.js';
import { InMemoryRunTriggerRepository } from '../../src/runs/infrastructure/in-memory-run-trigger.repository.js';
import { InMemoryConfigSnapshotStore, MockRunUpstream } from '../../src/runs/infrastructure/run-adapters.js';
import { RunsController } from '../../src/runs/presentation/runs.controller.js';
import { SCENARIO_CONFIG_READER } from '../../src/scenarios/application/ports/scenario-config.reader.js';
import { sleep, waitFor } from './support/wait.js';
import { FakeKafka } from './support/fake-kafka.js';
import { startHttpApp, type HttpApp } from './support/http-app.js';

const POLICY: RelayPolicy = { batchSize: 10, leaseMs: 2_000, backoffBaseMs: 30, backoffMaxMs: 60, maxAttempts: 0 };
const OTHER_SCENARIO_ID = '33333333-3333-4333-8333-333333333333';
const runs = (id = SCENARIO_ID) => `/api/v1/scenarios/${id}/runs`;

describe('Trigger API + outbox (in-process module)', () => {
  let outbox: InMemoryOutboxStore;
  let repo: InMemoryRunTriggerRepository;
  let upstream: MockRunUpstream;
  let gate: { closed: string[] };
  let kafka: FakeKafka;
  let http: HttpApp;
  let closed: boolean;
  let keyN = 0;
  const key = () => ({ 'Idempotency-Key': `mt-key-${++keyN}`, 'x-user-email': USER });

  beforeEach(async () => {
    closed = false;
    outbox = new InMemoryOutboxStore();
    repo = new InMemoryRunTriggerRepository(outbox);
    repo.seedScenario(scenarioSeed());
    repo.seedScenario(scenarioSeed({ id: OTHER_SCENARIO_ID }));
    upstream = new MockRunUpstream();
    gate = { closed: [] };
    kafka = new FakeKafka();

    @Module({
      controllers: [RunsController],
      providers: [
        TriggerScenarioUseCase,
        { provide: RUN_TRIGGER_REPOSITORY, useValue: repo },
        { provide: SCENARIO_CONFIG_READER, useValue: { read: async () => ({}) } },
        { provide: RUN_UPSTREAM, useValue: upstream },
        { provide: CONFIG_SNAPSHOT_STORE, useValue: new InMemoryConfigSnapshotStore() },
        { provide: COMMAND_TOPICS, useValue: TOPICS },
        { provide: EVENT_SCHEMA_VERSION, useValue: '1.1' },
        { provide: ENGINE_GATE, useValue: gate },
        { provide: CLOCK, useValue: { now: () => new Date() } },
        { provide: ID_GENERATOR, useValue: sequentialIds() },
        ...outboxWorkerProviders({
          store: { provide: OUTBOX_STORE, useValue: outbox },
          publisher: { provide: EVENT_PUBLISHER, useValue: kafka },
          policy: POLICY,
          worker: { pollIntervalMs: 15, autoStart: true },
          workerId: 'module-test-worker',
        }),
      ],
    })
    class TriggerFlowTestModule {}

    http = await startHttpApp(TriggerFlowTestModule);
  });

  afterEach(async () => {
    if (!closed) await http.close();
  });

  it('MT-01 202 with Location and the LLD body; the worker delivers the built run.trigger', async () => {
    const res = await http.post(runs(), triggerBody(), key());

    expect(res.status).toBe(202);
    expect(res.headers.get('location')).toBe(`/v1/runs/${res.body.correlation_id}`);
    expect(res.body).toEqual({
      correlation_id: expect.stringMatching(/^cid_/),
      scenario_id: SCENARIO_ID,
      engine: 'emulator',
      state: 'trigger_requested',
      triggered_by: USER,
      created_at: expect.any(String),
    });

    const [message] = await waitFor(() => {
      expect(kafka.delivered).toHaveLength(1);
      return kafka.delivered;
    });
    expect(message).toMatchObject({ topic: TOPICS.emulator, messageKey: res.body.correlation_id });
    const event = RunTriggerEventSchema.parse(message.payload);
    expect(event).toMatchObject({
      event_type: 'run.trigger',
      sequence: 1,
      issued_by: USER,
      correlation_id: res.body.correlation_id,
      references: { project_id: PROJECT_ID, scenario_id: SCENARIO_ID, map_id: MAP_ID, map_version_id: 'v1' },
    });
    await waitFor(() => expect(outbox.rows[0]).toMatchObject({ status: 'published', attempts: 1 }));
    // Publishing never confirms engine state.
    expect(repo.runs[0]).toMatchObject({ status: 'trigger_requested', pendingCommand: 'run' });
    expect(repo.currentRunIds.get(SCENARIO_ID)).toBe(repo.runs[0].id);
  });

  it('MT-02 400 idempotency_key_required in the LLD error envelope', async () => {
    const res = await http.post(runs(), triggerBody(), { 'x-request-id': 'req-mt-02' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'idempotency_key_required', message: expect.any(String), request_id: 'req-mt-02' },
    });
    expect(outbox.rows).toHaveLength(0);
  });

  it('MT-03 422 validation_failed for a bad body; 404 for a non-UUID scenario id; 400 for malformed JSON', async () => {
    const bad = await http.post(runs(), { engine: 'robot' }, key());
    expect(bad.status).toBe(422);
    expect(bad.body.error).toMatchObject({ code: 'validation_failed', details: { errors: [expect.objectContaining({ path: 'engine' })] } });

    const notUuid = await http.post(runs('not-a-uuid'), triggerBody(), key());
    expect(notUuid.status).toBe(404);
    expect(notUuid.body.error.code).toBe('scenario_not_found');

    expect((await http.post(runs(), '{"engine":', key())).status).toBe(400);
    expect(outbox.rows).toHaveLength(0);
  });

  it('MT-04 404 scenario_not_found', async () => {
    const res = await http.post(runs('99999999-9999-4999-8999-999999999999'), triggerBody(), key());
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('scenario_not_found');
  });

  it('MT-05 409 scenario_not_triggerable names the active run', async () => {
    const first = await http.post(runs(), triggerBody(), key());
    const res = await http.post(runs(), triggerBody(), key());
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'scenario_not_triggerable',
      details: { status: 'running', active_run: first.body.correlation_id },
    });
    await waitFor(() => expect(kafka.delivered).toHaveLength(1));
  });

  it('MT-06 repeated Idempotency-Key → 200 with the same run; different body → 422 idempotency_key_reuse', async () => {
    const headers = key();
    const first = await http.post(runs(), triggerBody(), headers);
    const replay = await http.post(runs(), triggerBody(), headers);
    expect(first.status).toBe(202);
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(first.body);

    const changed = await http.post(runs(), triggerBody({ priority: 'low' }), headers);
    expect(changed.status).toBe(422);
    expect(changed.body.error.code).toBe('idempotency_key_reuse');

    await waitFor(() => expect(kafka.delivered).toHaveLength(1));
  });

  it('MT-07 422 scenario_invalid lists every issue; nothing is created', async () => {
    repo.seedScenario(
      scenarioSeed({ config: { body: null, uri: null }, dataUris: { inbound: null, outbound: null, masterdata: null, mockput: null } }),
    );
    const res = await http.post(runs(), triggerBody(), key());
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('scenario_invalid');
    expect(res.body.error.details.issues.map((i: { code: string }) => i.code)).toEqual([
      'config_incomplete',
      'data_file_missing',
      'data_file_missing',
      'data_file_missing',
    ]);
    expect(repo.runs).toHaveLength(0);
    expect(outbox.rows).toHaveLength(0);
  });

  it('MT-08 503 engine_unavailable / upstream_unavailable carry Retry-After', async () => {
    gate.closed.push('emulator');
    const gated = await http.post(runs(), triggerBody(), key());
    expect(gated.status).toBe(503);
    expect(gated.body.error.code).toBe('engine_unavailable');
    expect(gated.headers.get('retry-after')).toBe('300');

    gate.closed.length = 0;
    upstream.unavailable = true;
    const down = await http.post(runs(), triggerBody(), key());
    expect(down.status).toBe(503);
    expect(down.body.error.code).toBe('upstream_unavailable');
    expect(down.headers.get('retry-after')).toBe('30');
    expect(outbox.rows).toHaveLength(0);
  });

  it('MT-09 keeps the event during a Kafka outage and delivers it once the broker recovers', async () => {
    kafka.goDown(true);
    const res = await http.post(runs(), triggerBody(), key());
    expect(res.status).toBe(202);

    await waitFor(() => {
      expect(kafka.attempts).toBeGreaterThanOrEqual(2);
      expect(outbox.rows[0]).toMatchObject({ status: 'pending', lastError: 'PublishError: broker unavailable' });
    });
    expect(kafka.delivered).toHaveLength(0);

    kafka.recover();
    await waitFor(() => expect(outbox.rows[0].status).toBe('published'));
    expect(kafka.delivered).toHaveLength(1);
    expect(kafka.delivered[0].messageKey).toBe(res.body.correlation_id);
  });

  it('MT-10 parks a non-retriable failure as dead without touching the run', async () => {
    kafka.goDown(false, 'record too large');
    await http.post(runs(), triggerBody(), key());
    await waitFor(() => expect(outbox.rows[0]).toMatchObject({ status: 'dead', attempts: 1 }));
    const attempts = kafka.attempts;
    await sleep(80);
    expect(kafka.attempts).toBe(attempts);
    expect(repo.runs[0]).toMatchObject({ status: 'trigger_requested', pendingCommand: 'run' });
  });

  it('MT-11 routes by engine and keys every message by its execution', async () => {
    const emu = await http.post(runs(), triggerBody(), key());
    const sim = await http.post(runs(OTHER_SCENARIO_ID), triggerBody({ engine: 'simulator' }), key());
    await waitFor(() => expect(kafka.delivered).toHaveLength(2));
    expect(kafka.byTopic(TOPICS.emulator).map((m) => m.messageKey)).toEqual([emu.body.correlation_id]);
    expect(kafka.byTopic(TOPICS.simulator).map((m) => m.messageKey)).toEqual([sim.body.correlation_id]);
  });

  it('MT-12 retry after a failed run is a new run linked to the old one; after completed it is 409', async () => {
    const first = await http.post(runs(), triggerBody(), key());
    await waitFor(() => expect(kafka.delivered).toHaveLength(1));

    // What the status worker does when the engine reports failed.
    repo.runs[0].status = 'failed';
    repo.runs[0].pendingCommand = null;
    repo.scenarios.get(SCENARIO_ID)!.status = 'finished';

    const retry = await http.post(runs(), triggerBody(), key());
    expect(retry.status).toBe(202);
    expect(retry.body.correlation_id).not.toBe(first.body.correlation_id);
    expect(repo.runs[1].retryOfRunId).toBe(repo.runs[0].id);
    await waitFor(() => expect(kafka.delivered).toHaveLength(2));

    repo.runs[1].status = 'completed';
    const again = await http.post(runs(), triggerBody(), key());
    expect(again.status).toBe(409);
    expect(again.body.error.details).toMatchObject({ status: 'completed' });
  });

  it('MT-13 burst of triggers across scenarios: every event delivered exactly once', async () => {
    const ids = Array.from({ length: 12 }, (_, i) => `44444444-4444-4444-8444-${String(i).padStart(12, '0')}`);
    ids.forEach((id) => repo.seedScenario(scenarioSeed({ id })));
    const responses = await Promise.all(ids.map((id) => http.post(runs(id), triggerBody(), key())));
    expect(responses.every((r) => r.status === 202)).toBe(true);
    await waitFor(() => expect(kafka.delivered).toHaveLength(12));
    expect(new Set(kafka.delivered.map((m) => m.correlationId)).size).toBe(12);
  });

  it('MT-14 without x-user-email the run is attributed to system', async () => {
    const res = await http.post(runs(), triggerBody(), { 'Idempotency-Key': 'anon' });
    expect(res.status).toBe(202);
    expect(res.body.triggered_by).toBe('system');
  });

  it('MT-15 shutting the app down stops the worker and disconnects the producer', async () => {
    const worker = http.app.get(OutboxWorker);
    expect(worker.isRunning).toBe(true);
    expect(kafka.connectCalls).toBe(1);
    await http.close();
    closed = true;
    expect(worker.isRunning).toBe(false);
    expect(kafka.disconnectCalls).toBe(1);
  });
});
