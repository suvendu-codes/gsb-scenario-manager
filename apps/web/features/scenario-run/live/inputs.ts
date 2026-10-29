import { resolveConfig } from "@/features/scenario-config/paths";
import { RUN_START_HOUR } from "@/features/scenario-config/timeline/geometry";
import type { ScenarioConfig } from "@/features/scenario-config/types";
import type { MapStation } from "@/features/scenario-config/upstream/stations";

import type { RunInputs } from "./types";

/**
 * The run inputs from a scenario's config as it is now: its stations (with their schedules and
 * queue limits), fleet size, run length and cutoff. A run plays what was configured.
 *
 * @param scenario - The scenario's id and name.
 * @param config - The scenario's config (defaults and overrides).
 * @param stations - The map's stations, for their labels.
 */
export function runInputsFrom(
  scenario: { id: string; name: string },
  config: ScenarioConfig,
  stations: readonly MapStation[],
): RunInputs {
  const values = resolveConfig(config.defaults, config.overrides);
  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    runHours: config.runDurationHours,
    startClock: RUN_START_HOUR,
    cutoffHour: values.wms.cutoffHour,
    stations: Object.entries(values.station.stations).map(([id, station]) => ({
      id,
      label: stations.find((s) => s.id === id)?.label ?? id,
      schedule: station.schedule,
      queueLimit: station.setup.queueLimit,
    })),
    bots: values.agent.fleet.htm + values.agent.fleet.vtm,
  };
}
