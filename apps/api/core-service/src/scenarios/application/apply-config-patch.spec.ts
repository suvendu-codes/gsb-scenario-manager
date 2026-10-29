import { describe, expect, it } from 'vitest';
import { applyConfigPatch } from './apply-config-patch.js';

const config = {
  agent: {
    defaults: { fleet: [{ type: 'a', count: 1 }], outage_pct: 5 },
    overrides: { outage_pct: 3 },
  },
  wms_order: {
    defaults: { number_of_waves: 4, data_window: { start: '00:00', end: '23:59' }, order_cutoff: '18:00' },
    overrides: { order_cutoff: '20:00' },
  },
};

describe('applyConfigPatch', () => {
  it('sets overrides, resets nulls to defaults, and reports changes', () => {
    const fleet = [{ type: 'quicktron_htm', count: 110 }];
    const { config: next, changes, modules } = applyConfigPatch(config, {
      agent: { overrides: { fleet, outage_pct: 8 } },
      wms_order: { overrides: { data_window: { start: '06:00' }, order_cutoff: null } },
    });

    expect(next).toMatchObject({
      agent: { overrides: { fleet, outage_pct: 8 } },
      wms_order: { overrides: { data_window: { start: '06:00' } } },
    });
    expect((next.wms_order as { overrides: object }).overrides).not.toHaveProperty('order_cutoff');
    expect(modules).toEqual(['agent', 'wms_order']);
    expect(changes).toEqual([
      { path: 'config.agent.outage_pct', to: 'custom', value: 8 },
      { path: 'config.agent.fleet', to: 'custom', value: fleet },
      { path: 'config.wms_order.order_cutoff', to: 'default', value: '18:00' },
      { path: 'config.wms_order.data_window.start', to: 'custom', value: '06:00' },
    ]);
    expect(config.agent.overrides).toEqual({ outage_pct: 3 });
  });

  it('resolves station_level defaults without the station id', () => {
    const { changes } = applyConfigPatch(
      { station: { station_level: { defaults: { structure: { front_positions: 2 } }, overrides: {} } } },
      { station: { station_level: { overrides: { 'PPS-101': { structure: { front_positions: null } } } } } },
    );
    expect(changes).toEqual([
      { path: 'config.station.station_level.PPS-101.structure.front_positions', to: 'default', value: 2 },
    ]);
  });

  it('reports null when a reset has no default', () => {
    const { changes } = applyConfigPatch(
      { agent: { overrides: { outage_pct: 3 } } },
      { agent: { overrides: { outage_pct: null } } },
    );
    expect(changes).toEqual([{ path: 'config.agent.outage_pct', to: 'default', value: null }]);
  });
});
