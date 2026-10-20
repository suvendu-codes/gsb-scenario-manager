import { MODULE_IDS } from "../schema";
import type { ModuleId, Overrides } from "../types";

/**
 * True when anything at or under `path` differs from the default.
 *
 * @param overrides - The scenario's overrides.
 * @param path - A leaf path, or a prefix such as `"wms"` or `"station.stations.PPS-101"`.
 */
export function isCustomized(overrides: Overrides, path: string): boolean {
  return Object.keys(overrides).some((key) => key === path || key.startsWith(`${path}.`));
}

/** The modules with at least one change from the default, in panel order. */
export function customizedModules(overrides: Overrides): ModuleId[] {
  return MODULE_IDS.filter((id) => isCustomized(overrides, id));
}
