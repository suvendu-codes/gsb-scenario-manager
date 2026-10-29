import { describe, expect, it } from 'vitest';
import {
  MAP_ID,
  PROJECT_ID,
  SCENARIO_ID,
  SHA_A,
  scenarioSnapshot,
  triggerRequest,
} from '../../../test/fixtures/trigger.js';
import { InvalidExecutionInputError } from './errors.js';
import {
  assertDataMatchesScenario,
  buildRunTriggerEvent,
  RunTriggerEventSchema,
} from './run-trigger-event.js';

const ISSUED_AT = new Date('2026-10-29T11:07:30.000Z');
const build = (overrides: Parameters<typeof triggerRequest>[0] = {}, scenario = scenarioSnapshot()) =>
  buildRunTriggerEvent({
    scenario,
    correlationId: 'cid_abc',
    schemaVersion: '1.1',
    issuedAt: ISSUED_AT,
    request: triggerRequest(overrides),
  });

describe('buildRunTriggerEvent', () => {
  it('produces the agreed v1.1 run.trigger envelope', () => {
    const event = build();
    expect(event).toEqual({
      event_type: 'run.trigger',
      command_id: 'run',
      version: '1.1',
      engine: 'emulator',
      sequence: 1,
      correlation_id: 'cid_abc',
      issued_at: '2026-10-29T11:07:30.000Z',
      issued_by: 'puneet.a@greyorange.com',
      priority: 'normal',
      references: {
        project_id: PROJECT_ID,
        scenario_id: SCENARIO_ID,
        map_id: MAP_ID,
        map_version_id: 'map-v1',
        pins: [
          {
            service: 'foundry_solution',
            artifact_type: 'solution',
            id: '69c199c6e8e409063d7736b7',
            version: 'v4',
            version_id: 'sol-ver-4',
          },
          { service: 'map_creator', artifact_type: 'map', id: MAP_ID, version_id: 'map-v1', etag: '"etag-1"' },
        ],
      },
      data: {
        outbound: {
          uri: 'gs://sm-stg/scenarios/scn/data/outbound.csv',
          sha256: SHA_A,
          size_bytes: 2961408,
          rows: 30240,
        },
      },
      config: {
        station: { pps: [{ pps_id: '1', mode: 'pick', flow: 'basic' }] },
        agent: { fleet: [{ type: 'quicktron_htm', count: 110 }], charging_enabled: true },
      },
      run: { execution_duration_minutes: 720, stop_policy: 'hard_stop' },
    });
  });

  it('takes project, scenario and map identity from the stored scenario, not the caller', () => {
    const event = build({}, scenarioSnapshot({ projectId: 'p-2', mapId: 'm-2', id: 'scn-2' }));
    expect(event.references).toMatchObject({ project_id: 'p-2', scenario_id: 'scn-2', map_id: 'm-2' });
  });

  it('omits optional fields instead of sending null/undefined', () => {
    const event = build({
      issuedBy: undefined,
      references: { pins: [{ service: 's', artifactType: 'a', id: 'i', versionId: 'v' }] },
      run: { executionDurationMinutes: 10 },
    });
    expect('issued_by' in event).toBe(false);
    expect('build' in event).toBe(false);
    expect('map_version_id' in event.references).toBe(false);
    expect(event.references.pins[0]).toEqual({ service: 's', artifact_type: 'a', id: 'i', version_id: 'v' });
    expect(event.run).toEqual({ execution_duration_minutes: 10 });
    expect(JSON.stringify(event)).not.toContain('null');
  });

  it('passes engine-owned build and config through untouched', () => {
    const build_ = { greymatter_release: 'r1', subsystems: ['relay'] };
    const config = { operator: { scan_tote_delay: 0 }, nested: { deep: [1, { x: true }] } };
    const event = build({ build: build_, config });
    expect(event.build).toEqual(build_);
    expect(event.config).toEqual(config);
  });

  it('carries priority and engine from the request', () => {
    const event = build({ priority: 'high', engine: 'simulator' });
    expect(event.priority).toBe('high');
    expect(event.engine).toBe('simulator');
  });

  it('honours the configured schema version', () => {
    const event = buildRunTriggerEvent({
      scenario: scenarioSnapshot(),
      correlationId: 'cid',
      schemaVersion: '2.0',
      issuedAt: ISSUED_AT,
      request: triggerRequest(),
    });
    expect(event.version).toBe('2.0');
  });

  it('always validates against the wire schema', () => {
    expect(RunTriggerEventSchema.safeParse(build()).success).toBe(true);
    expect(RunTriggerEventSchema.safeParse({ ...build(), sequence: 2 }).success).toBe(false);
    expect(RunTriggerEventSchema.safeParse({ ...build(), command_sequence: 1 }).success).toBe(false);
    expect(RunTriggerEventSchema.safeParse({ ...build(), issued_at: 'yesterday' }).success).toBe(false);
  });

  it('is deterministic for the same inputs', () => {
    expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
  });
});

describe('assertDataMatchesScenario', () => {
  const stored = 'gs://sm-stg/scenarios/scn/data/outbound.csv';

  it('accepts a request matching the stored file', () => {
    const scenario = scenarioSnapshot({
      dataUris: { inbound: null, outbound: stored, masterdata: null, mockput: null },
    });
    expect(() => assertDataMatchesScenario(scenario, triggerRequest())).not.toThrow();
  });

  it('rejects a request that omits a stored file', () => {
    const scenario = scenarioSnapshot({
      dataUris: { inbound: 'gs://b-1/in.csv', outbound: stored, masterdata: null, mockput: null },
    });
    expect(() => assertDataMatchesScenario(scenario, triggerRequest())).toThrow(InvalidExecutionInputError);
    expect(() => assertDataMatchesScenario(scenario, triggerRequest())).toThrow(/data\.inbound is required/);
  });

  it('rejects a different uri than the stored one', () => {
    const scenario = scenarioSnapshot({
      dataUris: { inbound: null, outbound: 'gs://b-1/other.csv', masterdata: null, mockput: null },
    });
    expect(() => build({}, scenario)).toThrow(/data\.outbound\.uri does not match/);
  });

  it('allows files the scenario does not store yet', () => {
    expect(() => assertDataMatchesScenario(scenarioSnapshot(), triggerRequest())).not.toThrow();
  });
});
