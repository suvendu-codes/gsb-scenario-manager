import { updateStations } from "../../state/station-edits";
import type { ConfigValues } from "../../types";

/** The two operation groups that are lists of independent settings. */
export type OperationMode = "pick" | "audit";

/**
 * The config path of one station's operations, such as
 * `station.stations.PPS-101.operations.pick.pickSlop`.
 *
 * @param stationId - The station.
 * @param mode - `pick`, `audit` or `put`.
 * @param key - A setting of that mode; leave out for the whole mode.
 */
export function operationPath(
  stationId: string,
  mode: OperationMode | "put",
  key?: string,
): string {
  const base = `station.stations.${stationId}.operations.${mode}`;
  return key ? `${base}.${key}` : base;
}

/**
 * Sets one pick or audit setting on each of the given stations. Operations have no "keeps its
 * own value" tracking, so this simply writes to every station listed.
 *
 * @param config - The current config.
 * @param ids - The stations to change.
 * @param mode - `pick` or `audit`.
 * @param key - The setting.
 * @param value - The option value for a choice, or a boolean for a toggle.
 */
export function setOperationValue(
  config: ConfigValues,
  ids: readonly string[],
  mode: OperationMode,
  key: string,
  value: string | boolean,
): ConfigValues {
  return updateStations(config, ids, (station) => ({
    ...station,
    operations: {
      ...station.operations,
      [mode]: { ...station.operations[mode], [key]: value },
    },
  }));
}
