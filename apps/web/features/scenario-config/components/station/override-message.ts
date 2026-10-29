import type { StationSection } from "../../state/station-edits";

/** "PPS-101", "PPS-101 and PPS-102", "PPS-101, PPS-102 and PPS-103". */
export function listStations(ids: readonly string[]): string {
  if (ids.length <= 1) return ids.join("");
  return `${ids.slice(0, -1).join(", ")} and ${ids[ids.length - 1]}`;
}

/**
 * The note shown in the All-stations panel when some stations keep their own value for a
 * section, so edits made there skip them.
 *
 * @param section - `schedule` or `structure`.
 * @param ids - The stations that keep their own value.
 * @returns The note, or null when no station does.
 */
export function allStationsNotice(section: StationSection, ids: readonly string[]): string | null {
  if (ids.length === 0) return null;
  const one = ids.length === 1;
  return one
    ? `${ids[0]} keeps its own ${section}, so changes here skip it. Open that station and use the shared ${section} to include it again.`
    : `${listStations(ids)} keep their own ${section}s, so changes here skip them. Open those stations and use the shared ${section} to include them again.`;
}

/**
 * The note shown in a station's panel when it keeps its own value for a section.
 *
 * @param section - `schedule` or `structure`.
 */
export function stationNotice(section: StationSection): string {
  return `This station keeps its own ${section}. Changes made for all stations skip it.`;
}
