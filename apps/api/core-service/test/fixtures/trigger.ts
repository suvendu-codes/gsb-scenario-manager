import type { OutboxMessage } from '../../src/outbox/domain/outbox-message.js';
import type { SeedScenario } from '../../src/runs/infrastructure/in-memory-run-trigger.repository.js';
import {
  TriggerRequestSchema,
  type TriggerRequest,
  type TriggerRequestInput,
} from '../../src/runs/domain/trigger-request.js';
import { validScenarioConfig } from '../../src/scenarios/presentation/dto/scenario-config.fixture.js';

export const SCENARIO_ID = '11111111-1111-4111-8111-111111111111';
export const PROJECT_ID = '69bed8af82b48a28a231db1b';
export const MAP_ID = '22222222-2222-4222-8222-222222222222';
export const USER = 'puneet.a@greyorange.com';

export const TOPICS = { emulator: 'test.emulator.commands', simulator: 'test.simulator.commands' } as const;

export const DATA_URIS = {
  inbound: 'gs://sm-stg/scenarios/scn/data/inbound.csv',
  outbound: 'gs://sm-stg/scenarios/scn/data/outbound.csv',
  masterdata: 'gs://sm-stg/scenarios/scn/data/masterdata.csv',
  mockput: null,
};

/** A valid stored config with one agent override, so merging is observable. */
export const storedConfig = (): Record<string, unknown> => {
  const config = structuredClone(validScenarioConfig) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  config.agent.overrides = { outage_pct: 8 };
  return config;
};

/** Deterministic RFC-4122-shaped ids: 00000000-0000-4000-8000-000000000001, ... */
export function sequentialIds(start = 1) {
  let n = start;
  return {
    uuid: () => `00000000-0000-4000-8000-${(n++).toString(16).padStart(12, '0')}`,
  };
}

export const triggerBody = (overrides: Partial<TriggerRequestInput> = {}): TriggerRequestInput => ({
  engine: 'emulator',
  priority: 'normal',
  ...overrides,
});

export const triggerRequest = (overrides: Partial<TriggerRequestInput> = {}): TriggerRequest =>
  TriggerRequestSchema.parse(triggerBody(overrides));

export function scenarioSeed(overrides: Partial<SeedScenario> = {}): SeedScenario {
  return {
    id: SCENARIO_ID,
    projectId: PROJECT_ID,
    mapId: MAP_ID,
    status: 'draft',
    config: { body: storedConfig(), uri: null },
    dataUris: { ...DATA_URIS },
    ...overrides,
  };
}

export function outboxMessage(overrides: Partial<OutboxMessage> = {}): OutboxMessage {
  const correlationId = overrides.correlationId ?? 'cid_test';
  return {
    id: '00000000-0000-4000-8000-0000000000aa',
    scenarioId: SCENARIO_ID,
    runId: '00000000-0000-4000-8000-0000000000bb',
    correlationId,
    engine: 'emulator',
    eventType: 'run.trigger',
    commandId: 'run',
    sequence: 1,
    topic: TOPICS.emulator,
    messageKey: correlationId,
    payload: { event_type: 'run.trigger', correlation_id: correlationId, sequence: 1 },
    headers: { event_id: 'x' },
    attempts: 1,
    createdAt: new Date('2026-10-29T10:00:00Z'),
    ...overrides,
  };
}
