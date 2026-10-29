import { beforeEach, describe, expect, it } from 'vitest';
import {
  SCENARIO_ID,
  TOPICS,
  scenarioSnapshot,
  sequentialIds,
  triggerRequest,
} from '../../../../test/fixtures/trigger.js';
import { InMemoryOutboxStore } from '../../../outbox/infrastructure/in-memory-outbox.store.js';
import { ScenarioNotFoundError } from '../../../scenarios/domain/errors.js';
import {
  ActiveRunExistsError,
  IdempotencyKeyReusedError,
  InvalidExecutionInputError,
  ScenarioNotTriggerableError,
} from '../../domain/errors.js';
import { RunTriggerEventSchema } from '../../domain/run-trigger-event.js';
import { InMemoryRunTriggerRepository } from '../../infrastructure/in-memory-run-trigger.repository.js';
import { TriggerScenarioUseCase } from './trigger-scenario.use-case.js';

const NOW = new Date('2026-10-29T10:00:00.000Z');

describe('TriggerScenarioUseCase', () => {
  let outbox: InMemoryOutboxStore;
  let repo: InMemoryRunTriggerRepository;
  let useCase: TriggerScenarioUseCase;

  beforeEach(() => {
    outbox = new InMemoryOutboxStore(() => NOW.getTime());
    repo = new InMemoryRunTriggerRepository(outbox, () => NOW);
    repo.seedScenario(scenarioSnapshot());
    useCase = new TriggerScenarioUseCase(repo, TOPICS, '1.1', { now: () => NOW }, sequentialIds());
  });

  it('creates the run and the outbox row together', async () => {
    const { run, replayed } = await useCase.execute({ scenarioId: SCENARIO_ID, request: triggerRequest() });

    expect(replayed).toBe(false);
    expect(run).toMatchObject({
      id: '00000000-0000-4000-8000-000000000001',
      scenarioId: SCENARIO_ID,
      correlationId: 'cid_00000000-0000-4000-8000-000000000002',
      engine: 'emulator',
      status: 'trigger_requested',
      pendingCommand: 'run',
      commandSequence: 1,
      priority: 'normal',
      issuedBy: 'puneet.a@greyorange.com',
      idempotencyKey: null,
    });
    expect(run.requestHash).toMatch(/^[0-9a-f]{64}$/);
    expect(repo.runs).toHaveLength(1);
    expect(repo.scenarios.get(SCENARIO_ID)?.status).toBe('running');

    expect(outbox.rows).toHaveLength(1);
    const row = outbox.rows[0];
    expect(row).toMatchObject({
      id: '00000000-0000-4000-8000-000000000003',
      runId: run.id,
      scenarioId: SCENARIO_ID,
      correlationId: run.correlationId,
      messageKey: run.correlationId,
      eventType: 'run.trigger',
      commandId: 'run',
      sequence: 1,
      topic: TOPICS.emulator,
      status: 'pending',
      attempts: 0,
    });
    expect(row.headers).toEqual({
      event_id: row.id,
      event_type: 'run.trigger',
      correlation_id: run.correlationId,
      schema_version: '1.1',
      'content-type': 'application/json',
    });
    const event = RunTriggerEventSchema.parse(row.payload);
    expect(event.correlation_id).toBe(run.correlationId);
    expect(event.issued_at).toBe(NOW.toISOString());
  });

  it('routes simulator runs to the simulator topic', async () => {
    await useCase.execute({ scenarioId: SCENARIO_ID, request: triggerRequest({ engine: 'simulator' }) });
    expect(outbox.rows[0].topic).toBe(TOPICS.simulator);
    expect(outbox.rows[0].engine).toBe('simulator');
  });

  it('throws not found for an unknown scenario and writes nothing', async () => {
    await expect(
      useCase.execute({ scenarioId: '99999999-9999-4999-8999-999999999999', request: triggerRequest() }),
    ).rejects.toThrow(ScenarioNotFoundError);
    expect(repo.runs).toHaveLength(0);
    expect(outbox.rows).toHaveLength(0);
  });

  it.each(['running', 'paused'])('refuses a scenario in status %s', async (status) => {
    repo.seedScenario(scenarioSnapshot({ status }));
    await expect(useCase.execute({ scenarioId: SCENARIO_ID, request: triggerRequest() })).rejects.toThrow(
      ScenarioNotTriggerableError,
    );
    expect(outbox.rows).toHaveLength(0);
  });

  it('refuses a second run while one is active', async () => {
    await useCase.execute({ scenarioId: SCENARIO_ID, request: triggerRequest() });
    repo.scenarios.get(SCENARIO_ID)!.status = 'finished'; // even if the scenario says finished
    await expect(useCase.execute({ scenarioId: SCENARIO_ID, request: triggerRequest() })).rejects.toThrow(
      ActiveRunExistsError,
    );
    expect(repo.runs).toHaveLength(1);
    expect(outbox.rows).toHaveLength(1);
  });

  it.each(['completed', 'failed', 'cancelled'] as const)(
    'allows a new execution with a new correlation after %s',
    async (terminal) => {
      const first = await useCase.execute({ scenarioId: SCENARIO_ID, request: triggerRequest() });
      repo.runs[0].status = terminal;
      repo.scenarios.get(SCENARIO_ID)!.status = 'finished';

      const second = await useCase.execute({ scenarioId: SCENARIO_ID, request: triggerRequest() });
      expect(second.run.id).not.toBe(first.run.id);
      expect(second.run.correlationId).not.toBe(first.run.correlationId);
      expect(outbox.rows.map((r) => r.correlationId)).toEqual([
        first.run.correlationId,
        second.run.correlationId,
      ]);
      expect(outbox.rows.every((r) => r.sequence === 1)).toBe(true);
    },
  );

  it('rejects input that conflicts with the stored files and writes nothing', async () => {
    repo.seedScenario(
      scenarioSnapshot({ dataUris: { inbound: 'gs://b-1/in.csv', outbound: null, masterdata: null, mockput: null } }),
    );
    await expect(useCase.execute({ scenarioId: SCENARIO_ID, request: triggerRequest() })).rejects.toThrow(
      InvalidExecutionInputError,
    );
    expect(repo.runs).toHaveLength(0);
    expect(outbox.rows).toHaveLength(0);
    expect(repo.scenarios.get(SCENARIO_ID)?.status).toBe('draft');
  });

  it('rolls back the run when the outbox write fails', async () => {
    repo.failOutboxInsert = true;
    await expect(useCase.execute({ scenarioId: SCENARIO_ID, request: triggerRequest() })).rejects.toThrow(
      /simulated outbox insert failure/,
    );
    expect(repo.runs).toHaveLength(0);
    expect(outbox.rows).toHaveLength(0);
    expect(repo.scenarios.get(SCENARIO_ID)?.status).toBe('draft');
  });

  describe('Idempotency-Key', () => {
    it('returns the original run for a retried identical request', async () => {
      const first = await useCase.execute({ scenarioId: SCENARIO_ID, idempotencyKey: 'k1', request: triggerRequest() });
      const again = await useCase.execute({ scenarioId: SCENARIO_ID, idempotencyKey: 'k1', request: triggerRequest() });
      expect(again.replayed).toBe(true);
      expect(again.run.id).toBe(first.run.id);
      expect(again.run.correlationId).toBe(first.run.correlationId);
      expect(outbox.rows).toHaveLength(1);
    });

    it('replays even after the run became terminal', async () => {
      const first = await useCase.execute({ scenarioId: SCENARIO_ID, idempotencyKey: 'k1', request: triggerRequest() });
      repo.runs[0].status = 'completed';
      const again = await useCase.execute({ scenarioId: SCENARIO_ID, idempotencyKey: 'k1', request: triggerRequest() });
      expect(again.run.id).toBe(first.run.id);
      expect(outbox.rows).toHaveLength(1);
    });

    it('rejects the same key with a different body', async () => {
      await useCase.execute({ scenarioId: SCENARIO_ID, idempotencyKey: 'k1', request: triggerRequest() });
      await expect(
        useCase.execute({
          scenarioId: SCENARIO_ID,
          idempotencyKey: 'k1',
          request: triggerRequest({ priority: 'high' }),
        }),
      ).rejects.toThrow(IdempotencyKeyReusedError);
      expect(outbox.rows).toHaveLength(1);
    });

    it('serialises concurrent identical requests into one run', async () => {
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          useCase.execute({ scenarioId: SCENARIO_ID, idempotencyKey: 'k1', request: triggerRequest() }),
        ),
      );
      expect(new Set(results.map((r) => r.run.id)).size).toBe(1);
      expect(results.filter((r) => !r.replayed)).toHaveLength(1);
      expect(outbox.rows).toHaveLength(1);
    });
  });

  it('lets exactly one of several concurrent triggers win without a key', async () => {
    const settled = await Promise.allSettled(
      Array.from({ length: 4 }, () => useCase.execute({ scenarioId: SCENARIO_ID, request: triggerRequest() })),
    );
    expect(settled.filter((s) => s.status === 'fulfilled')).toHaveLength(1);
    const rejected = settled.filter((s): s is PromiseRejectedResult => s.status === 'rejected');
    expect(rejected).toHaveLength(3);
    expect(rejected.every((r) => r.reason instanceof ActiveRunExistsError)).toBe(true);
    expect(outbox.rows).toHaveLength(1);
  });
});
