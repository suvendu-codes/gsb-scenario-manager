import type { ConfigValues } from "./types";
import type { MapStation } from "./upstream/stations";

/** What is shown for a station the registry lookup does not describe. */
function unknownStation(id: string): MapStation {
  return {
    id,
    label: id,
    registryType: "unknown",
    allowedModes: [],
    status: "unknown",
    systems: [],
    location: null,
    pickDirection: null,
    frontPositions: null,
    queueLength: null,
    rollcageDocks: null,
    registryUrl: null,
    registryVersion: null,
  };
}

/**
 * The stations the config page lists: one per station in the config, in the config's order,
 * described by the map's PPS lookup. The config decides which stations exist, so a station the
 * lookup lacks is still listed (with unknown details), and a lookup station the config lacks is
 * left out.
 *
 * @param config - The scenario's config (its defaults or its effective values).
 * @param lookup - The map's stations, or an empty list while they load.
 */
export function stationsInConfig(
  config: ConfigValues,
  lookup: readonly MapStation[],
): MapStation[] {
  const byId = new Map(lookup.map((station) => [station.id, station]));
  return Object.keys(config.station.stations).map((id) => byId.get(id) ?? unknownStation(id));
}
