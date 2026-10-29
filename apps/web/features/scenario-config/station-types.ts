import type { MapStation } from "./upstream/stations";

/** A group of stations of one type, edited together in the type's panel. */
export type StationType = {
  /** The registry's type, as given (`manual`, `ppp_manual`, …). */
  id: string;
  /** The type as people read it ("Manual", "PPP manual"). */
  label: string;
  /** Its stations, in the config's order. */
  stationIds: string[];
};

/** Words the registry writes in lower case that read as abbreviations. */
const ABBREVIATIONS = new Set(["pps", "ppp", "rtp", "ttp", "htm", "vtm"]);

/**
 * A registry type as people read it: `ppp_manual` becomes "PPP manual", `tote_extraction`
 * "Tote extraction"; a type already written for people ("Standard PPS") stays as it is.
 *
 * @param type - The registry's type.
 */
export function typeLabel(type: string): string {
  if (/[A-Z ]/.test(type)) return type;
  const words = type.split("_").filter(Boolean);
  const text = words.map((word) => (ABBREVIATIONS.has(word) ? word.toUpperCase() : word)).join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Groups stations by the registry's type, in the order the types first appear. Until the
 * registry types are mapped to the design's types (Standard, Split, Roll cage), each registry
 * type is its own group; changing that is a change to this function only.
 *
 * @param stations - The scenario's stations, in the config's order.
 */
export function stationTypes(stations: readonly MapStation[]): StationType[] {
  const types: StationType[] = [];
  for (const station of stations) {
    const type = types.find((candidate) => candidate.id === station.registryType);
    if (type) type.stationIds.push(station.id);
    else {
      types.push({
        id: station.registryType,
        label: typeLabel(station.registryType),
        stationIds: [station.id],
      });
    }
  }
  return types;
}

/** The type a station belongs to, or undefined for a station not in the list. */
export function typeOfStation(types: readonly StationType[], id: string): StationType | undefined {
  return types.find((type) => type.stationIds.includes(id));
}
