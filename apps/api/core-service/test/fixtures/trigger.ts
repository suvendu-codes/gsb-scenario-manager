import type { OutboxMessage } from '../../src/outbox/domain/outbox-message.js';
import type { TriggerScenarioSnapshot } from '../../src/runs/domain/run-trigger-event.js';
import {
  TriggerRequestSchema,
  type TriggerRequest,
  type TriggerRequestInput,
} from '../../src/runs/domain/trigger-request.js';

export const SHA_A = 'a'.repeat(64);
export const SHA_B = 'b'.repeat(64);

export const SCENARIO_ID = '11111111-1111-4111-8111-111111111111';
export const PROJECT_ID = '69bed8af82b48a28a231db1b';
export const MAP_ID = '22222222-2222-4222-8222-222222222222';

export const TOPICS = { emulator: 'test.emulator.commands', simulator: 'test.simulator.commands' } as const;

/** Deterministic RFC-4122-shaped ids: 00000000-0000-4000-8000-000000000001, ... */
export function sequentialIds(start = 1) {
  let n = start;
  return {
    uuid: () => `00000000-0000-4000-8000-${(n++).toString(16).padStart(12, '0')}`,
  };
}

export function triggerBody(overrides: Partial<TriggerRequestInput> = {}): TriggerRequestInput {
  return {
    engine: 'emulator',
    priority: 'normal',
    issuedBy: 'puneet.a@greyorange.com',
    references: {
      mapVersionId: 'map-v1',
      pins: [
        {
          service: 'foundry_solution',
          artifactType: 'solution',
          id: '69c199c6e8e409063d7736b7',
          version: 'v4',
          versionId: 'sol-ver-4',
        },
        {
          service: 'map_creator',
          artifactType: 'map',
          id: MAP_ID,
          versionId: 'map-v1',
          etag: '"etag-1"',
        },
      ],
    },
    data: {
      outbound: {
        uri: 'gs://sm-stg/scenarios/scn/data/outbound.csv',
        sha256: SHA_A,
        sizeBytes: 2961408,
        rows: 30240,
      },
    },
    config: {
      station: { pps: [{ pps_id: '1', mode: 'pick', flow: 'basic' }] },
      agent: { fleet: [{ type: 'quicktron_htm', count: 110 }], charging_enabled: true },
    },
    run: { executionDurationMinutes: 720, stopPolicy: 'hard_stop' },
    ...overrides,
  };
}

export const triggerRequest = (overrides: Partial<TriggerRequestInput> = {}): TriggerRequest =>
  TriggerRequestSchema.parse(triggerBody(overrides));

export function scenarioSnapshot(overrides: Partial<TriggerScenarioSnapshot> = {}): TriggerScenarioSnapshot {
  return {
    id: SCENARIO_ID,
    projectId: PROJECT_ID,
    mapId: MAP_ID,
    status: 'draft',
    dataUris: { inbound: null, outbound: null, masterdata: null, mockput: null },
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
