import { describe, expect, it } from 'vitest';
import { DATA_URIS, storedConfig } from '../../../test/fixtures/trigger.js';
import { checkScenarioInputs, effectiveConfig, mergeOverrides } from './scenario-readiness.js';

const STATION = '33333333-3333-4333-8333-333333333333';

describe('mergeOverrides', () => {
  it('merges objects field by field and replaces arrays and scalars', () => {
    const defaults = { a: 1, nested: { x: 1, y: 2 }, list: [1, 2, 3] };
    expect(mergeOverrides(defaults, { nested: { y: 9 }, list: [7] })).toEqual({ a: 1, nested: { x: 1, y: 9 }, list: [7] });
  });

  it('returns a copy of the defaults when nothing is overridden', () => {
    const defaults = { a: { b: 1 } };
    const merged = mergeOverrides(defaults, undefined) as { a: { b: number } };
    merged.a.b = 2;
    expect(defaults.a.b).toBe(1);
  });
});

describe('effectiveConfig', () => {
  it('resolves every module to defaults plus overrides', () => {
    const config = storedConfig();
    const effective = effectiveConfig(config) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(effective.agent.outage_pct).toBe(8);
    expect(effective.agent.charging_enabled).toBe(true);
    expect(effective.wms_order.number_of_waves).toBe(4);
    expect(effective.station.shared.order_handling.order_sequencing).toBe('fifo');
    expect(effective.station.station_level.stations).toEqual({});
    expect(effective).not.toHaveProperty('agent.overrides');
  });

  it('merges each overridden station on top of the station-level defaults', () => {
    const config = storedConfig() as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    config.station.station_level.overrides = { [STATION]: { structure: { front_positions: 2 } } };
    const effective = effectiveConfig(config) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    const station = effective.station.station_level.stations[STATION];
    expect(station.structure.front_positions).toBe(2);
    expect(station.structure.front_operation).toBe(config.station.station_level.defaults.structure.front_operation);
  });
});

describe('checkScenarioInputs', () => {
  it('passes a complete scenario', () => {
    expect(checkScenarioInputs({ config: storedConfig(), dataUris: { ...DATA_URIS } })).toEqual([]);
  });

  it('reports a missing config as config_incomplete', () => {
    expect(checkScenarioInputs({ config: null, dataUris: { ...DATA_URIS } })).toEqual([
      { code: 'config_incomplete', message: 'The scenario has no config.' },
    ]);
  });

  it('reports invalid and missing config fields with their paths', () => {
    const config = storedConfig() as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    config.agent.defaults.outage_pct = 'lots';
    delete config.wms_order.defaults.number_of_waves;
    const issues = checkScenarioInputs({ config, dataUris: { ...DATA_URIS } });
    expect(issues).toContainEqual(expect.objectContaining({ code: 'config_invalid', path: 'config.agent.defaults.outage_pct' }));
    expect(issues).toContainEqual(expect.objectContaining({ code: 'config_incomplete', path: 'config.wms_order.defaults.number_of_waves' }));
  });

  it('collects every missing required file but not mockput', () => {
    const issues = checkScenarioInputs({
      config: storedConfig(),
      dataUris: { inbound: null, outbound: null, masterdata: 'gs://b-1/m.csv', mockput: null },
    });
    expect(issues.map((i) => [i.code, i.file_type])).toEqual([
      ['data_file_missing', 'inbound'],
      ['data_file_missing', 'outbound'],
    ]);
  });

  it('collects config and file issues together', () => {
    const issues = checkScenarioInputs({ config: null, dataUris: { inbound: null, outbound: null, masterdata: null, mockput: null } });
    expect(issues).toHaveLength(4);
  });
});
