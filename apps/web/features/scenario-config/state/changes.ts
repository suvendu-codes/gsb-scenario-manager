import { deepEqual, getAtPath, isPlainObject } from "../paths";
import { ORDER_TYPES } from "../schema";
import type { ConfigValues, Overrides, PatchConfigBody } from "../types";

/**
 * Flattens a value into its leaves: `[path, value]` pairs in dot notation. Arrays, primitives
 * and null are leaves, so a station's schedule is one entry.
 *
 * @param value - The value to flatten.
 * @param prefix - Path of `value` itself; leave empty for a whole config.
 */
export function leafEntries(value: unknown, prefix = ""): Array<[string, unknown]> {
  if (!isPlainObject(value)) return prefix ? [[prefix, value]] : [];
  return Object.entries(value).flatMap(([key, child]) =>
    leafEntries(child, prefix ? `${prefix}.${key}` : key),
  );
}

/**
 * Builds the patch that turns one config into another: every leaf that differs becomes a `set`.
 *
 * @param current - The config as it is now.
 * @param next - The config after an edit.
 * @returns The patch, or null when nothing changed.
 */
export function diffToPatch(current: ConfigValues, next: ConfigValues): PatchConfigBody | null {
  const set: Overrides = {};
  for (const [path, value] of leafEntries(next)) {
    if (!deepEqual(value, getAtPath(current, path))) set[path] = value;
  }
  return Object.keys(set).length > 0 ? { set } : null;
}

/**
 * Puts list values in the order the server keeps them (stations in the map's order), so equal
 * lists compare equal.
 */
function normalise(path: string, value: unknown, stationIds: string[]): unknown {
  if (!Array.isArray(value)) return value;
  if (path === "wms.orderTypes") {
    const rank = (type: unknown) => ORDER_TYPES.indexOf(type as (typeof ORDER_TYPES)[number]);
    return [...value].sort((a, b) => rank(a) - rank(b));
  }
  if (path.startsWith("station.apply.") || path.startsWith("station.override.")) {
    const rank = (id: unknown) => stationIds.indexOf(String(id));
    return [...value].sort((a, b) => rank(a) - rank(b));
  }
  return value;
}

function underPrefix(key: string, prefix: string): boolean {
  return key === prefix || key.startsWith(`${prefix}.`);
}

/**
 * Applies a patch to the overrides the way the server does, so the screen can show an edit
 * before the server answers: `reset` first, then `set`, and a value equal to its default is not
 * kept as an override. The inputs are not changed.
 *
 * @param defaults - The scenario's default config.
 * @param overrides - The current overrides.
 * @param patch - The change.
 */
export function applyPatchToOverrides(
  defaults: ConfigValues,
  overrides: Overrides,
  patch: PatchConfigBody,
): Overrides {
  const next: Overrides = { ...overrides };
  for (const prefix of patch.reset ?? []) {
    for (const key of Object.keys(next)) {
      if (underPrefix(key, prefix)) delete next[key];
    }
  }
  for (const [path, raw] of Object.entries(patch.set ?? {})) {
    const value = normalise(path, raw, Object.keys(defaults.station.stations));
    if (deepEqual(value, getAtPath(defaults, path))) delete next[path];
    else next[path] = value;
  }
  return next;
}

/**
 * The patch that undoes `patch`: every path it touches goes back to the override it had in
 * `before`, or is reset if it had none.
 *
 * @param before - The overrides before `patch` was applied.
 * @param patch - The change to undo.
 */
export function inversePatch(before: Overrides, patch: PatchConfigBody): PatchConfigBody {
  const touched = new Set(Object.keys(patch.set ?? {}));
  for (const prefix of patch.reset ?? []) {
    for (const key of Object.keys(before)) {
      if (underPrefix(key, prefix)) touched.add(key);
    }
  }

  const set: Overrides = {};
  const reset: string[] = [];
  for (const path of touched) {
    if (Object.prototype.hasOwnProperty.call(before, path)) set[path] = before[path];
    else reset.push(path);
  }
  return {
    ...(Object.keys(set).length > 0 ? { set } : {}),
    ...(reset.length > 0 ? { reset } : {}),
  };
}
