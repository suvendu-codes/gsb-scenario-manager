/**
 * In-process module tests: real HTTP controller, trigger use case, event builder, outbox relay and
 * worker loop, wired through Nest exactly like production. PostgreSQL and Kafka are replaced by
 * the in-memory store/repository (same semantics) and FakeKafka, so this suite needs no Docker.
 * The PostgreSQL + Kafka suite (outbox-postgres-kafka.module.spec.ts) covers the real adapters.
 */
import { Module } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  MAP_ID,
  PROJECT_ID,
  SCENARIO_ID,
  TOPICS,
  scenarioSnapshot,
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
  EVENT_SCHEMA_VERSION,
  ID_GENERATOR,
  RUN_TRIGGER_REPOSITORY,
} from '../../src/runs/application/ports/run-trigger.repository.js';
import { TriggerScenarioUseCase } from '../../src/runs/application/use-cases/trigger-scenario.use-case.js';
import { RunTriggerEventSchema } from '../../src/runs/domain/run-trigger-event.js';
import { InMemoryRunTriggerRepository } from '../../src/runs/infrastructure/in-memory-run-trigger.repository.js';
import { RunsController } from '../../src/runs/presentation/runs.controller.js';
import { sleep, waitFor } from './support/wait.js';
import { FakeKafka } from './support/fake-kafka.js';
import { startHttpApp, type HttpApp } from './support/http-app.js';

const POLICY: RelayPolicy = { batchSize: 10, leaseMs: 2_000, backoffBaseMs: 30, backoffMaxMs: 60, maxAttempts: 0 };
const OTHER_SCENARIO_ID = '33333333-3333-4333-8333-333333333333';
const trigger = (id = SCENARIO_ID) => `/api/v1/scenarios/${id}/trigger`;

describe('Outbox flow (in-process module)', () => {
  let outbox: InMemoryOutboxStore;
  let repo: InMemoryRunTriggerRepository;
  let kafka: FakeKafka;
  let http: HttpApp;
  let closed: boolean;

  beforeEach(async () => {
    closed = false;
    outbox = new InMemoryOutboxStore();
    repo = new InMemoryRunTriggerRepository(outbox);
    repo.seedScenario(scenarioSnapshot());
    repo.seedScenario(scenarioSnapshot({ id: OTHER_SCENARIO_ID }));
    kafka = new FakeKafka();

    @Module({
      controllers: [RunsController],
      providers: [
        TriggerScenarioUseCase,
        { provide: RUN_TRIGGER_REPOSITORY, useValue: repo },
        { provide: COMMAND_TOPICS, useValue: TOPICS },
        { provide: EVENT_SCHEMA_VERSION, useValue: '1.1' },
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
    class OutboxFlowTestModule {}

    http = await startHttpApp(OutboxFlowTestModule);
  });

  afterEach(async () => {
    if (!closed) await http.close();
  });

  it('MT-01 trigger returns 202 and the worker delivers the built run.trigger event', async () => {
    const res = await http.post(trigger(), triggerBody());

    expect(res.status).toBe(202);
    expect(res.body).toMatchObject({
      scenarioId: SCENARIO_ID,
      engine: 'emulator',
      status: 'trigger_requested',
      pendingCommand: 'run',
      commandSequence: 1,
      replayed: false,
    });
    expect(res.body.correlationId).toMatch(/^cid_/);

    const [message] = await waitFor(() => {
      expect(kafka.delivered).toHaveLength(1);
      return kafka.delivered;
    });
    expect(message.topic).toBe(TOPICS.emulator);
    expect(message.messageKey).toBe(res.body.correlationId);
    expect(message.headers).toMatchObject({ event_type: 'run.trigger', correlation_id: res.body.correlationId });

    const event = RunTriggerEventSchema.parse(message.payload);
    expect(event).toMatchObject({
      event_type: 'run.trigger',
      command_id: 'run',
      sequence: 1,
      version: '1.1',
      correlation_id: res.body.correlationId,
      references: { project_id: PROJECT_ID, scenario_id: SCENARIO_ID, map_id: MAP_ID },
    });

    await waitFor(() => expect(outbox.rows[0]).toMatchObject({ status: 'published', attempts: 1 }));
    // Publishing never confirms engine state: the run stays trigger_requested with Run pending.
    expect(repo.runs[0]).toMatchObject({ status: 'trigger_requested', pendingCommand: 'run' });
    expect(repo.scenarios.get(SCENARIO_ID)?.status).toBe('running');
  });

  it('MT-02 rejects an invalid body with 400 and queues nothing', async () => {
    const res = await http.post(trigger(), { ...triggerBody(), engine: 'robot' });
    expect(res.status).toBe(400);
    expect(repo.runs).toHaveLength(0);
    expect(outbox.rows).toHaveLength(0);
  });

  it('MT-03 rejects malformed JSON and a non-UUID scenario id with 400', async () => {
    expect((await http.post(trigger(), '{"engine":')).status).toBe(400);
    expect((await http.post(trigger('not-a-uuid'), triggerBody())).status).toBe(400);
    expect(outbox.rows).toHaveLength(0);
  });

  it('MT-04 returns 404 for an unknown scenario', async () => {
    const res = await http.post(trigger('99999999-9999-4999-8999-999999999999'), triggerBody());
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'ScenarioNotFoundError' });
  });

  it('MT-05 returns 409 for a second trigger while the first run is active', async () => {
    expect((await http.post(trigger(), triggerBody())).status).toBe(202);
    const res = await http.post(trigger(), triggerBody());
    expect(res.status).toBe(409);
    await waitFor(() => expect(kafka.delivered).toHaveLength(1));
    await sleep(60);
    expect(kafka.delivered).toHaveLength(1);
  });

  it('MT-06 Idempotency-Key: replay returns the same run, changed body conflicts, bad key is 400', async () => {
    const headers = { 'Idempotency-Key': 'click-42' };
    const first = await http.post(trigger(), triggerBody(), headers);
    const replay = await http.post(trigger(), triggerBody(), headers);
    expect(first.status).toBe(202);
    expect(replay.status).toBe(202);
    expect(replay.body).toMatchObject({ runId: first.body.runId, correlationId: first.body.correlationId, replayed: true });

    const changed = await http.post(trigger(), triggerBody({ priority: 'low' }), headers);
    expect(changed.status).toBe(409);
    expect(changed.body).toMatchObject({ error: 'IdempotencyKeyReusedError' });

    const bad = await http.post(trigger(OTHER_SCENARIO_ID), triggerBody(), { 'Idempotency-Key': 'has space' });
    expect(bad.status).toBe(400);

    await waitFor(() => expect(kafka.delivered).toHaveLength(1));
  });

  it('MT-07 rejects data that contradicts the stored scenario files with 400', async () => {
    repo.seedScenario(
      scenarioSnapshot({ dataUris: { inbound: null, outbound: 'gs://other-bucket/o.csv', masterdata: null, mockput: null } }),
    );
    const res = await http.post(trigger(), triggerBody());
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/data\.outbound\.uri does not match/);
    expect(outbox.rows).toHaveLength(0);
  });

  it('MT-08 keeps the event during a Kafka outage and delivers it once the broker recovers', async () => {
    kafka.goDown(true);
    const res = await http.post(trigger(), triggerBody());
    expect(res.status).toBe(202);

    await waitFor(() => {
      expect(kafka.attempts).toBeGreaterThanOrEqual(2);
      expect(outbox.rows[0]).toMatchObject({ status: 'pending', lastError: 'PublishError: broker unavailable' });
    });
    expect(kafka.delivered).toHaveLength(0);

    kafka.recover();
    await waitFor(() => expect(outbox.rows[0].status).toBe('published'));
    expect(kafka.delivered).toHaveLength(1);
    expect(kafka.delivered[0].messageKey).toBe(res.body.correlationId);
    expect(outbox.rows[0].lastError).toBeNull();
  });

  it('MT-09 parks a non-retriable failure as dead without touching the run', async () => {
    kafka.goDown(false, 'record too large');
    await http.post(trigger(), triggerBody());

    await waitFor(() => expect(outbox.rows[0]).toMatchObject({ status: 'dead', attempts: 1 }));
    const attempts = kafka.attempts;
    await sleep(80);
    expect(kafka.attempts).toBe(attempts);
    expect(repo.runs[0]).toMatchObject({ status: 'trigger_requested', pendingCommand: 'run' });
  });

  it('MT-10 routes by engine and keys every message by its execution', async () => {
    const emu = await http.post(trigger(), triggerBody());
    const sim = await http.post(trigger(OTHER_SCENARIO_ID), triggerBody({ engine: 'simulator' }));

    await waitFor(() => expect(kafka.delivered).toHaveLength(2));
    expect(kafka.byTopic(TOPICS.emulator).map((m) => m.messageKey)).toEqual([emu.body.correlationId]);
    expect(kafka.byTopic(TOPICS.simulator).map((m) => m.messageKey)).toEqual([sim.body.correlationId]);
  });

  it('MT-11 a re-run after a terminal execution gets a new correlation and is delivered too', async () => {
    const first = await http.post(trigger(), triggerBody());
    await waitFor(() => expect(kafka.delivered).toHaveLength(1));

    // The status worker would do this when the engine reports completion.
    repo.runs[0].status = 'completed';
    repo.runs[0].pendingCommand = null;
    repo.scenarios.get(SCENARIO_ID)!.status = 'finished';

    const second = await http.post(trigger(), triggerBody());
    expect(second.status).toBe(202);
    expect(second.body.correlationId).not.toBe(first.body.correlationId);
    await waitFor(() => expect(kafka.delivered).toHaveLength(2));
    expect(kafka.delivered.map((m) => m.messageKey)).toEqual([first.body.correlationId, second.body.correlationId]);
  });

  it('MT-12 burst of triggers across scenarios: every event delivered exactly once', async () => {
    const ids = Array.from({ length: 12 }, (_, i) => `44444444-4444-4444-8444-${String(i).padStart(12, '0')}`);
    ids.forEach((id) => repo.seedScenario(scenarioSnapshot({ id })));

    const responses = await Promise.all(ids.map((id) => http.post(trigger(id), triggerBody())));
    expect(responses.every((r) => r.status === 202)).toBe(true);

    await waitFor(() => expect(kafka.delivered).toHaveLength(12));
    expect(new Set(kafka.delivered.map((m) => m.correlationId)).size).toBe(12);
    expect(outbox.rows.every((r) => r.status === 'published')).toBe(true);
  });

  it('MT-13 shutting the app down stops the worker and disconnects the producer', async () => {
    const worker = http.app.get(OutboxWorker);
    expect(worker.isRunning).toBe(true);
    expect(kafka.connectCalls).toBe(1);

    await http.close();
    closed = true;
    expect(worker.isRunning).toBe(false);
    expect(kafka.disconnectCalls).toBe(1);
  });
});
