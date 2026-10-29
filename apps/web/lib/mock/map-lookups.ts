import { MAP_FIXTURES } from "./data";
import { assertProjectMap } from "./store";

/** Which upstream answer a map lookup serves. */
export type MapLookup = keyof (typeof MAP_FIXTURES)[string];

/**
 * The body of a mock map lookup: the map's fixture, wrapped as `{ map_id, map_version?, <key> }`
 * when the fixture is a bare list (as the registry captures are). `map_version` is echoed when
 * the request names one; the mock keeps one version per map.
 *
 * @throws {MockApiError} 404 for an unknown project or map.
 */
export function mapLookupBody(
  lookup: MapLookup,
  projectId: string,
  mapId: string,
  mapVersion: string | null,
): unknown {
  assertProjectMap(projectId, mapId);
  const fixture = MAP_FIXTURES[mapId]?.[lookup] ?? [];
  const listKey = lookup === "pps" ? "pps" : "bot_types";
  const body = Array.isArray(fixture) ? { [listKey]: fixture } : { ...(fixture as object) };
  return { ...body, map_id: mapId, ...(mapVersion && { map_version: mapVersion }) };
}
