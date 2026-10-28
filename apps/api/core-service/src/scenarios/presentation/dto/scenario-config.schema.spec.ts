import { describe, expect, it } from 'vitest';
import { ScenarioConfigPatchSchema } from './scenario-config.schema.js';

const patch = (stationId: string) =>
  ScenarioConfigPatchSchema.safeParse({ station: { station_level: { overrides: { [stationId]: {} } } } });

describe('ScenarioConfigPatchSchema station ids', () => {
  it('accepts a uuid station id', () => {
    expect(patch('3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b').success).toBe(true);
  });

  it.each(['PPS.101', 'PPS-101'])('rejects non-uuid station id %s', (id) => {
    expect(patch(id).success).toBe(false);
  });
});
