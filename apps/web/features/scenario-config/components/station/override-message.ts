import type { StationSection } from "../../state/station-edits";

/** "PPS 1", "PPS 1 and PPS 2", "PPS 1, PPS 2 and PPS 3". */
export function listStations(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * The note shown in a type's panel when some of its stations keep their own value for a
 * section, so edits made there skip them.
 *
 * @param section - `schedule` or `structure`.
 * @param names - The stations that keep their own value.
 * @returns The note, or null when no station does.
 */
export function typeNotice(section: StationSection, names: readonly string[]): string | null {
  if (names.length === 0) return null;
  return names.length === 1
    ? `${names[0]} keeps its own ${section}, so changes here skip it. Open it and use the type’s ${section} to include it again.`
    : `${listStations(names)} keep their own ${section}s, so changes here skip them. Open them and use the type’s ${section} to include them again.`;
}

/**
 * The note shown in a station's panel when it keeps its own value for a section.
 *
 * @param section - `schedule` or `structure`.
 * @param typeLabel - The station's type.
 */
export function stationNotice(section: StationSection, typeLabel: string): string {
  return `This station keeps its own ${section}: it differs from most ${typeLabel} stations, so changes made for the type skip it.`;
}
