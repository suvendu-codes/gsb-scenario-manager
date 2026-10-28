import { isCustomized } from "../../state/customized";
import { keepingOwn, updateStations } from "../../state/station-edits";
import type { ConfigValues, Overrides, StationConfig } from "../../types";

type StructureKey = keyof StationConfig["structure"];

const STRUCTURE_PATH = /^station\.stations\.[^.]+\.structure\.([A-Za-z]+)$/;

/**
 * The structure value a path points at, such as `backOperator` for
 * `station.stations.PPS-101.structure.backOperator`.
 *
 * @param path - A config path.
 * @returns The key, or null if the path is not a station structure value.
 */
export function structureKeyOf(path: string): StructureKey | null {
  const match = STRUCTURE_PATH.exec(path);
  return match ? (match[1] as StructureKey) : null;
}

/**
 * Puts one station back to its default settings.
 *
 * @param config - The current config.
 * @param defaults - The default config.
 * @param id - The station to reset.
 */
export function resetStation(
  config: ConfigValues,
  defaults: ConfigValues,
  id: string,
): ConfigValues {
  return updateStations(config, [id], () => structuredClone(defaults.station.stations[id]));
}

/**
 * True when a station has changed settings, or keeps its own schedule or structure within its
 * group (its type's stations).
 */
export function isStationCustomized(
  config: ConfigValues,
  overrides: Overrides,
  id: string,
  group: readonly string[],
): boolean {
  return (
    isCustomized(overrides, `station.stations.${id}`) ||
    keepingOwn(config, group, "schedule").includes(id) ||
    keepingOwn(config, group, "structure").includes(id)
  );
}
