import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAP_ID,
  SCENARIO_ID,
  TOPICS,
  USER,
  scenarioSeed,
  sequentialIds,
  storedConfig,
  triggerRequest,
} from '../../../../test/fixtures/trigger.js';
import { InMemoryOutboxStore } from '../../../outbox/infrastructure/in-memory-outbox.store.js';
import type { ScenarioConfigReader } from '../../../scenarios/application/ports/scenario-config.reader.js';
import { ScenarioNotFoundError } from '../../../scenarios/domain/errors.js';
import {
  EngineUnavailableError,
  IdempotencyKeyReuseError,
  ScenarioBlockedError,
  ScenarioInvalidError,
  ScenarioNotTriggerableError,
  StorageUnavailableError,
  TriggerUpstreamUnavailableError,
  type RunApiError,
} from '../../domain/errors.js';
import { RunTriggerEventSchema } from '../../domain/run-trigger-event.js';
import { InMemoryRunTriggerRepository } from '../../infrastructure/in-memory-run-trigger.repository.js';
import { InMemoryConfigSnapshotStore, MockRunUpstream } from '../../infrastructure/run-adapters.js';
import type { EngineGate } from '../ports/run-trigger.repository.js';
import { TriggerScenarioUseCase, type TriggerScenarioInput } from './trigger-scenario.use-case.js';

const NOW = new Date('2026-10-29T10:00:00.000Z');
const BLOB_URI = 'gs://configs/scenarios/scn/config.json';

describe('TriggerScenarioUseCase (LLD §5)', () => {
  let outbox: InMemoryOutboxStore;
  let repo: InMemoryRunTriggerRepository;
  let upstream: MockRunUpstream;
  let snapshots: InMemoryConfigSnapshotStore;
  let blobs: Map<string, Record<string, unknown>>;
  let gate: { closed: ('emulator' | 'simulator')[] };
  let useCase: TriggerScenarioUseCase;
  let keyN: number;

  const reader: ScenarioConfigReader = {
    read: async (uri) => {
      const found = blobs.get(uri);
      if (!found) throw new Error('unreadable');
      return structuredClone(found);
    },
  };
  const trigger = (overrides: Partial<TriggerScenarioInput> = {}) =>
    useCase.execute({
      scenarioId: SCENARIO_ID,
      idempotencyKey: `key-${++keyN}`,
      request: triggerRequest(),
      triggeredBy: USER,
      ...overrides,
    });
  const rejection = async (p: Promise<unknown>) => (await p.then(() => undefined, (e: unknown) => e)) as RunApiError;

  beforeEach(() => {
    keyN = 0;
    outbox = new InMemoryOutboxStore(() => NOW.getTime());
    repo = new InMemoryRunTriggerRepository(outbox, () => NOW);
    repo.seedScenario(scenarioSeed());
    upstream = new MockRunUpstream();
    snapshots = new InMemoryConfigSnapshotStore();
    blobs = new Map([[BLOB_URI, storedConfig()]]);
    gate = { closed: [] };
    useCase = new TriggerScenarioUseCase(
      repo, reader, upstream, snapshots, TOPICS, '1.1', gate as EngineGate, { now: () => NOW }, sequentialIds(),
    );
  });

  it('creates the run, pins versions and snapshot, and queues the event in one commit', async () => {
    const { run, replayed } = await trigger({ idempotencyKey: 'k1' });

    expect(replayed).toBe(false);
    expect(run).toMatchObject({
      id: '00000000-0000-4000-8000-000000000001',
      correlationId: 'cid_00000000-0000-4000-8000-000000000002',
      scenarioId: SCENARIO_ID,
      engine: 'emulator',
      status: 'trigger_requested',
      priority: 'normal',
      pendingCommand: 'run',
      commandSequence: 1,
      retryOfRunId: null,
      triggeredBy: USER,
      mapVersion: 'v1',
      sizerVersion: 'v1',
      configSnapshotUri: `memory://runs/${SCENARIO_ID}/cid_00000000-0000-4000-8000-000000000002/config.json`,
      idempotencyKey: 'k1',
    });
    expect(repo.scenarios.get(SCENARIO_ID)?.status).toBe('running');
    expect(repo.currentRunIds.get(SCENARIO_ID)).toBe(run.id);

    expect(outbox.rows).toHaveLength(1);
    const row = outbox.rows[0];
    expect(row).toMatchObject({ runId: run.id, topic: TOPICS.emulator, messageKey: run.correlationId, sequence: 1 });
    const event = RunTriggerEventSchema.parse(row.payload);
    expect(event).toMatchObject({
      correlation_id: run.correlationId,
      issued_by: USER,
      issued_at: NOW.toISOString(),
      references: { scenario_id: SCENARIO_ID, map_id: MAP_ID, map_version_id: 'v1' },
    });
    // The engine gets the effective config (defaults + overrides), also stored as the snapshot.
    expect((event.config as { agent: { outage_pct: number } }).agent.outage_pct).toBe(8);
    expect([...snapshots.objects.values()][0]).toEqual(event.config);
  });

  it('reads the config blob when the scenario stores a URI instead of a body', async () => {
    repo.seedScenario(scenarioSeed({ config: { body: null, uri: BLOB_URI } }));
    await trigger();
    expect(outbox.rows).toHaveLength(1);
  });

  it('routes simulator runs to the simulator topic with the requested priority', async () => {
    await trigger({ request: triggerRequest({ engine: 'simulator', priority: 'high' }) });
    expect(outbox.rows[0]).toMatchObject({ topic: TOPICS.simulator, engine: 'simulator' });
    expect(outbox.rows[0].payload).toMatchObject({ priority: 'high' });
  });

  describe('Idempotency-Key', () => {
    it('returns the original run for a repeated key (replayed → 200)', async () => {
      const first = await trigger({ idempotencyKey: 'k1' });
      const again = await trigger({ idempotencyKey: 'k1' });
      expect(again.replayed).toBe(true);
      expect(again.run.correlationId).toBe(first.run.correlationId);
      expect(outbox.rows).toHaveLength(1);
    });

    it('replays before any other check, even once the scenario is running', async () => {
      await trigger({ idempotencyKey: 'k1' });
      gate.closed.push('emulator');
      await expect(trigger({ idempotencyKey: 'k1' })).resolves.toMatchObject({ replayed: true });
    });

    it('rejects the same key with a different request (422 idempotency_key_reuse)', async () => {
      await trigger({ idempotencyKey: 'k1' });
      const error = await rejection(trigger({ idempotencyKey: 'k1', request: triggerRequest({ priority: 'low' }) }));
      expect(error).toBeInstanceOf(IdempotencyKeyReuseError);
      expect(error).toMatchObject({ status: 422, code: 'idempotency_key_reuse' });
    });

    it('serialises concurrent retries with one key into one run', async () => {
      const results = await Promise.all(Array.from({ length: 5 }, () => trigger({ idempotencyKey: 'same' })));
      expect(new Set(results.map((r) => r.run.id)).size).toBe(1);
      expect(results.filter((r) => !r.replayed)).toHaveLength(1);
      expect(outbox.rows).toHaveLength(1);
    });
  });

  it('404 for an unknown scenario, nothing written', async () => {
    await expect(trigger({ scenarioId: '99999999-9999-4999-8999-999999999999' })).rejects.toThrow(ScenarioNotFoundError);
    expect(outbox.rows).toHaveLength(0);
  });

  it('503 engine_unavailable when the engine gate is closed, with Retry-After', async () => {
    gate.closed.push('simulator');
    await expect(trigger()).resolves.toBeDefined(); // emulator still open
    repo.seedScenario(scenarioSeed({ id: '44444444-4444-4444-8444-444444444444' }));
    const error = await rejection(
      trigger({ scenarioId: '44444444-4444-4444-8444-444444444444', request: triggerRequest({ engine: 'simulator' }) }),
    );
    expect(error).toBeInstanceOf(EngineUnavailableError);
    expect(error).toMatchObject({ status: 503, code: 'engine_unavailable', retryAfter: 300 });
  });

  describe('status and failure brake', () => {
    const seedRuns = (...statuses: string[]) =>
      statuses.forEach((status, i) =>
        repo.seedRun({ id: `run-${i}`, scenarioId: SCENARIO_ID, correlationId: `cid-old-${i}`, status: status as never }),
      );

    it('409 with the active run while a run is in progress', async () => {
      const first = await trigger();
      const error = await rejection(trigger());
      expect(error).toBeInstanceOf(ScenarioNotTriggerableError);
      expect(error).toMatchObject({ status: 409, details: { status: 'running', active_run: first.run.correlationId } });
      expect(outbox.rows).toHaveLength(1);
    });

    it('409 scenario_not_triggerable after a completed run (clone it)', async () => {
      repo.seedScenario(scenarioSeed({ status: 'finished' }));
      seedRuns('completed');
      const error = await rejection(trigger());
      expect(error).toMatchObject({ status: 409, code: 'scenario_not_triggerable', details: { status: 'completed' } });
    });

    it.each(['failed', 'cancelled'])('retries after a %s run: new correlation linked to the old run', async (status) => {
      repo.seedScenario(scenarioSeed({ status: 'finished' }));
      seedRuns(status);
      const { run } = await trigger();
      expect(run.retryOfRunId).toBe('run-0');
      expect(run.correlationId).not.toBe('cid-old-0');
      expect(repo.currentRunIds.get(SCENARIO_ID)).toBe(run.id);
    });

    it('409 scenario_blocked after three consecutive failures', async () => {
      repo.seedScenario(scenarioSeed({ status: 'finished' }));
      seedRuns('failed', 'failed', 'failed');
      const error = await rejection(trigger());
      expect(error).toBeInstanceOf(ScenarioBlockedError);
      expect(error).toMatchObject({ status: 409, code: 'scenario_blocked' });
    });

    it('is not blocked when a non-failure breaks the streak', async () => {
      repo.seedScenario(scenarioSeed({ status: 'finished' }));
      seedRuns('failed', 'failed', 'cancelled', 'failed');
      await expect(trigger()).resolves.toBeDefined();
    });

    it('only one of several concurrent triggers wins', async () => {
      const settled = await Promise.allSettled(Array.from({ length: 4 }, () => trigger()));
      expect(settled.filter((s) => s.status === 'fulfilled')).toHaveLength(1);
      const rejected = settled.filter((s): s is PromiseRejectedResult => s.status === 'rejected');
      expect(rejected.every((r) => r.reason instanceof ScenarioNotTriggerableError)).toBe(true);
      expect(outbox.rows).toHaveLength(1);
    });
  });

  describe('scenario_invalid (422) — every issue, nothing written', () => {
    it('collects config and data-file issues and skips upstream', async () => {
      repo.seedScenario(
        scenarioSeed({ config: { body: null, uri: null }, dataUris: { inbound: null, outbound: null, masterdata: 'gs://b-1/m.csv', mockput: null } }),
      );
      upstream.unavailable = true; // would be 503 if it were called
      const error = await rejection(trigger());
      expect(error).toBeInstanceOf(ScenarioInvalidError);
      expect((error as ScenarioInvalidError).issues.map((i) => i.code)).toEqual([
        'config_incomplete',
        'data_file_missing',
        'data_file_missing',
      ]);
      expect(repo.runs).toHaveLength(0);
      expect(outbox.rows).toHaveLength(0);
      expect(snapshots.objects.size).toBe(0);
      expect(repo.scenarios.get(SCENARIO_ID)?.status).toBe('draft');
    });

    it.each([
      ['map_not_found', (u: MockRunUpstream) => u.missingMaps.add(MAP_ID)],
      ['sizer_not_found', (u: MockRunUpstream) => u.mapsWithoutSizer.add(MAP_ID)],
    ])('reports upstream %s', async (code, arrange) => {
      arrange(upstream);
      const error = await rejection(trigger());
      expect((error as ScenarioInvalidError).issues.map((i) => i.code)).toEqual([code]);
      expect(outbox.rows).toHaveLength(0);
    });
  });

  it('503 upstream_unavailable when upstream does not answer', async () => {
    upstream.unavailable = true;
    const error = await rejection(trigger());
    expect(error).toBeInstanceOf(TriggerUpstreamUnavailableError);
    expect(error).toMatchObject({ status: 503, code: 'upstream_unavailable', retryAfter: 30 });
    expect(outbox.rows).toHaveLength(0);
  });

  it('503 storage_unavailable when the config blob or the snapshot store fails', async () => {
    repo.seedScenario(scenarioSeed({ config: { body: null, uri: 'gs://configs/missing.json' } }));
    expect(await rejection(trigger())).toBeInstanceOf(StorageUnavailableError);
    repo.seedScenario(scenarioSeed());
    snapshots.fail = true;
    expect(await rejection(trigger())).toBeInstanceOf(StorageUnavailableError);
    expect(outbox.rows).toHaveLength(0);
  });

  it('rolls back the run when the outbox write fails', async () => {
    repo.failOutboxInsert = true;
    await expect(trigger()).rejects.toThrow(/simulated outbox insert failure/);
    expect(repo.runs).toHaveLength(0);
    expect(outbox.rows).toHaveLength(0);
    expect(repo.scenarios.get(SCENARIO_ID)?.status).toBe('draft');
  });
});
