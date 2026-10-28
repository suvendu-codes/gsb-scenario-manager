import { getAtPath, isPlainObject, splitPath } from "./paths";
import type { CatalogField, ConfigValues } from "./types";

const STATION_TOKEN = "{stationId}";

/**
 * Returns a copy of a config with one value changed. The input is not changed.
 *
 * @param config - The config to edit.
 * @param path - Dot-notation path of an existing value.
 * @param value - The new value.
 * @throws {Error} If the path does not exist in the config.
 */
export function setValueAtPath(config: ConfigValues, path: string, value: unknown): ConfigValues {
  const segments = splitPath(path);
  if (!segments) throw new Error(`Unknown config path: ${path}`);

  const next = structuredClone(config) as unknown as Record<string, unknown>;
  let current = next;
  for (const segment of segments.slice(0, -1)) {
    const child = current[segment];
    if (!isPlainObject(child)) throw new Error(`Unknown config path: ${path}`);
    current = child;
  }
  const last = segments[segments.length - 1];
  if (!Object.prototype.hasOwnProperty.call(current, last)) {
    throw new Error(`Unknown config path: ${path}`);
  }
  current[last] = value;
  return next as unknown as ConfigValues;
}

/** Fills the station id into a path such as `station.stations.{stationId}.schedule`. */
export function withStationId(path: string, stationId?: string): string {
  return stationId ? path.replaceAll(STATION_TOKEN, stationId) : path;
}

/**
 * A copy of a field with the station id filled into its paths.
 *
 * @param field - A catalog field.
 * @param stationId - The station being edited, for per-station fields.
 */
export function resolveField(field: CatalogField, stationId?: string): CatalogField {
  const resolved = { ...field, path: withStationId(field.path, stationId) };
  if (field.visibleWhen) {
    resolved.visibleWhen = {
      ...field.visibleWhen,
      path: withStationId(field.visibleWhen.path, stationId),
    };
  }
  if (field.type === "stepper" && field.maxPath) {
    (resolved as typeof field).maxPath = withStationId(field.maxPath, stationId);
  }
  return resolved;
}

/**
 * Whether a field should be shown: its `visibleWhen` condition holds, and it is not a hardware
 * field. The site registry says nothing about gravity induction or EasyLoop hardware, and the
 * new design drops those sections, so their fields are not shown (they are removed in the
 * cleanup PR).
 *
 * @param field - A field with its paths already resolved.
 * @param config - The current config.
 */
export function isFieldVisible(field: CatalogField, config: ConfigValues): boolean {
  if (field.visibleWhen && getAtPath(config, field.visibleWhen.path) !== field.visibleWhen.equals) {
    return false;
  }
  return field.stationFeature === undefined;
}
