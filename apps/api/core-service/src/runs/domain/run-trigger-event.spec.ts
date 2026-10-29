import { describe, expect, it } from 'vitest';
import { DATA_URIS, MAP_ID, PROJECT_ID, SCENARIO_ID, USER } from '../../../test/fixtures/trigger.js';
import { buildRunTriggerEvent, RunTriggerEventSchema, type BuildRunTriggerEventInput } from './run-trigger-event.js';

const input = (overrides: Partial<BuildRunTriggerEventInput> = {}): BuildRunTriggerEventInput => ({
  scenario: { id: SCENARIO_ID, projectId: PROJECT_ID, mapId: MAP_ID },
  correlationId: 'cid_abc',
  engine: 'emulator',
  priority: 'normal',
  schemaVersion: '1.1',
  issuedAt: new Date('2026-10-29T11:07:30.000Z'),
  issuedBy: USER,
  mapVersion: 'v7',
  sizerVersion: 'v3',
  config: { agent: { outage_pct: 8 } },
  dataUris: { ...DATA_URIS },
  ...overrides,
});

describe('buildRunTriggerEvent', () => {
  it('produces the run.trigger envelope from the stored scenario and pinned versions', () => {
    expect(buildRunTriggerEvent(input())).toEqual({
      event_type: 'run.trigger',
      command_id: 'run',
      version: '1.1',
      engine: 'emulator',
      sequence: 1,
      correlation_id: 'cid_abc',
      issued_at: '2026-10-29T11:07:30.000Z',
      issued_by: USER,
      priority: 'normal',
      references: {
        project_id: PROJECT_ID,
        scenario_id: SCENARIO_ID,
        map_id: MAP_ID,
        map_version_id: 'v7',
        pins: [
          { service: 'map_creator', artifact_type: 'map', id: MAP_ID, version: 'v7' },
          { service: 'sizer', artifact_type: 'sizer', id: MAP_ID, version: 'v3' },
        ],
      },
      data: {
        inbound: { uri: DATA_URIS.inbound },
        outbound: { uri: DATA_URIS.outbound },
        masterdata: { uri: DATA_URIS.masterdata },
      },
      config: { agent: { outage_pct: 8 } },
    });
  });

  it('omits data files the scenario does not have (mockput is optional)', () => {
    const event = buildRunTriggerEvent(input({ dataUris: { ...DATA_URIS, mockput: 'gs://b-1/mockput.csv' } }));
    expect(event.data.mockput).toEqual({ uri: 'gs://b-1/mockput.csv' });
    expect('mockput' in buildRunTriggerEvent(input()).data).toBe(false);
  });

  it('carries engine, priority and schema version', () => {
    const event = buildRunTriggerEvent(input({ engine: 'simulator', priority: 'high', schemaVersion: '2.0' }));
    expect(event).toMatchObject({ engine: 'simulator', priority: 'high', version: '2.0' });
  });

  it('validates against the wire schema', () => {
    const event = buildRunTriggerEvent(input());
    expect(RunTriggerEventSchema.safeParse(event).success).toBe(true);
    expect(RunTriggerEventSchema.safeParse({ ...event, sequence: 2 }).success).toBe(false);
    expect(RunTriggerEventSchema.safeParse({ ...event, command_sequence: 1 }).success).toBe(false);
    expect(RunTriggerEventSchema.safeParse({ ...event, issued_at: 'yesterday' }).success).toBe(false);
    expect(() => buildRunTriggerEvent(input({ correlationId: '' }))).toThrow();
  });

  it('is deterministic for the same inputs', () => {
    expect(JSON.stringify(buildRunTriggerEvent(input()))).toBe(JSON.stringify(buildRunTriggerEvent(input())));
  });
});
