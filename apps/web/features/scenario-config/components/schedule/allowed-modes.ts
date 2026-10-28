import { STATION_MODES } from "../../schema";
import type { StationMode } from "../../types";
import type { MapStation } from "../../upstream/stations";

/**
 * The modes every one of these stations may work in, as the site registry says. A station the
 * registry does not describe is not limited. A schedule edited for several stations at once
 * can only use the modes all of them allow.
 *
 * @param stations - The scenario's stations, with their registry details.
 * @param ids - The stations being edited.
 */
export function allowedModesFor(
  stations: readonly MapStation[],
  ids: readonly string[],
): StationMode[] {
  return STATION_MODES.filter((mode) =>
    ids.every((id) => {
      const station = stations.find((candidate) => candidate.id === id);
      return !station || station.registryType === "unknown" || station.allowedModes.includes(mode);
    }),
  );
}
