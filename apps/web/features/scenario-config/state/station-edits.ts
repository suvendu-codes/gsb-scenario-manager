import { deepEqual } from "../paths";
import type { ConfigValues, ScheduleBlock, StationConfig } from "../types";

/**
 * Pure edits for the Stations module, as the design has them. Each takes a config and returns a
 * new one (the input is not changed).
 *
 * Stations are edited in groups: a station type, or every station. Within a group, the value most
 * of its stations have is the group's shared value; a station with a different value "keeps its
 * own". Nothing about that is stored: it is worked out from the values, so a station rejoins its
 * group as soon as its value matches again. A group edit changes the stations that follow the
 * shared value and skips those that keep their own.
 */

/** The two sections where group edits skip stations that keep their own value. */
export type StationSection = "schedule" | "structure";

type Structure = StationConfig["structure"];

/** Structure values a group edit can set together. */
export const STRUCTURE_KEYS = [
  "frontOperation",
  "pickingDestination",
  "backOperator",
  "carrierAssociationSide",
  "binClearingSide",
  "frontPositions",
  "staffedFrontPositions",
  "staffedBackSeats",
] as const satisfies ReadonlyArray<keyof Structure>;

/** Back seats a station has. */
export const BACK_SEATS = 2;

/** The ids of the config's stations, in the map's order. */
export function stationIds(config: ConfigValues): string[] {
  return Object.keys(config.station.stations);
}

/** Applies `recipe` to each listed station. */
export function updateStations(
  config: ConfigValues,
  ids: readonly string[],
  recipe: (station: StationConfig) => StationConfig,
): ConfigValues {
  const next = structuredClone(config);
  for (const id of ids) next.station.stations[id] = recipe(next.station.stations[id]);
  return next;
}

function pickStructure(structure: Structure): Structure {
  return Object.fromEntries(STRUCTURE_KEYS.map((key) => [key, structure[key]])) as Structure;
}

/** The value of a section for one station, as compared within a group. */
function sectionValue(config: ConfigValues, id: string, section: StationSection): unknown {
  const station = config.station.stations[id];
  return section === "schedule" ? station.schedule : pickStructure(station.structure);
}

/**
 * The stations of a group that share its most common value for a section: the largest set of
 * stations with equal values. On a tie, the set still on its defaults wins (so changing one
 * station of a two-station type makes that one keep its own, not the other); failing that, the
 * set with the earliest station. Empty for an empty group.
 *
 * @param config - The config.
 * @param group - The stations of the group, in order.
 * @param section - `schedule` or `structure`.
 * @param defaults - The default config, to break ties; without it, the earliest set wins.
 */
export function followers(
  config: ConfigValues,
  group: readonly string[],
  section: StationSection,
  defaults?: ConfigValues,
): string[] {
  const sets: string[][] = [];
  for (const id of group) {
    const value = sectionValue(config, id, section);
    const set = sets.find((ids) => deepEqual(sectionValue(config, ids[0], section), value));
    if (set) set.push(id);
    else sets.push([id]);
  }
  const onDefaults = (ids: string[]) =>
    defaults !== undefined &&
    ids.every((id) =>
      deepEqual(sectionValue(config, id, section), sectionValue(defaults, id, section)),
    );
  return sets.reduce<string[]>((best, ids) => {
    if (ids.length !== best.length) return ids.length > best.length ? ids : best;
    return onDefaults(ids) && !onDefaults(best) ? ids : best;
  }, []);
}

/** The stations of a group that keep their own value for a section. */
export function keepingOwn(
  config: ConfigValues,
  group: readonly string[],
  section: StationSection,
  defaults?: ConfigValues,
): string[] {
  const shared = followers(config, group, section, defaults);
  return group.filter((id) => !shared.includes(id));
}

/** The schedule a group shares, or null for an empty group. */
export function sharedBlocks(
  config: ConfigValues,
  group: readonly string[],
  defaults?: ConfigValues,
): ScheduleBlock[] | null {
  const [first] = followers(config, group, "schedule", defaults);
  return first ? config.station.stations[first].schedule : null;
}

/** A station whose structure is the one the group shares, or null for an empty group. */
export function sharedStructureId(
  config: ConfigValues,
  group: readonly string[],
  defaults?: ConfigValues,
): string | null {
  return followers(config, group, "structure", defaults)[0] ?? null;
}

function withStationBlocks(
  config: ConfigValues,
  ids: readonly string[],
  blocks: ScheduleBlock[],
): ConfigValues {
  return updateStations(config, ids, (station) => ({
    ...station,
    schedule: structuredClone(blocks),
  }));
}

/** Keeps structure values consistent: positions 1-2, staffed seats within what exists. */
function normaliseStructure(structure: Structure): Structure {
  const frontPositions = Math.min(Math.max(structure.frontPositions, 1), 2);
  return {
    ...structure,
    frontPositions,
    staffedFrontPositions: Math.min(Math.max(structure.staffedFrontPositions, 0), frontPositions),
    staffedBackSeats: Math.min(Math.max(structure.staffedBackSeats, 0), BACK_SEATS),
  };
}

/** Sets the schedule of one station. Whether it then keeps its own follows from the values. */
export function writeStationSchedule(
  config: ConfigValues,
  id: string,
  blocks: ScheduleBlock[],
): ConfigValues {
  return withStationBlocks(config, [id], blocks);
}

/** Sets the schedule of every station of a group that follows the group's shared schedule. */
export function writeGroupSchedule(
  config: ConfigValues,
  group: readonly string[],
  blocks: ScheduleBlock[],
  defaults?: ConfigValues,
): ConfigValues {
  return withStationBlocks(config, followers(config, group, "schedule", defaults), blocks);
}

/** Gives every station of a group one station's schedule, so none keeps its own. */
export function copySchedule(
  config: ConfigValues,
  sourceId: string,
  group: readonly string[],
): ConfigValues {
  return withStationBlocks(config, group, config.station.stations[sourceId].schedule);
}

/** Changes structure values for one station. */
export function writeStationStructure(
  config: ConfigValues,
  id: string,
  patch: Partial<Structure>,
): ConfigValues {
  return updateStations(config, [id], (station) => ({
    ...station,
    structure: normaliseStructure({ ...station.structure, ...patch }),
  }));
}

/** Changes structure values for every station of a group that follows its shared structure. */
export function writeGroupStructure(
  config: ConfigValues,
  group: readonly string[],
  patch: Partial<Structure>,
  defaults?: ConfigValues,
): ConfigValues {
  return updateStations(config, followers(config, group, "structure", defaults), (station) => ({
    ...station,
    structure: normaliseStructure({ ...station.structure, ...patch }),
  }));
}

/**
 * The schedule the rest of a station's group shares: what `revertToShared` would give it. Null
 * when the station is alone in its group.
 */
export function sharedScheduleFor(
  config: ConfigValues,
  group: readonly string[],
  id: string,
  defaults?: ConfigValues,
): ScheduleBlock[] | null {
  const others = group.filter((other) => other !== id);
  return sharedBlocks(config, others, defaults);
}

/**
 * Makes a station take its group's shared value for a section again.
 *
 * @param config - The config.
 * @param group - The station's group.
 * @param id - The station.
 * @param section - `schedule` or `structure`.
 * @param defaults - The default config, to break ties.
 */
export function revertToShared(
  config: ConfigValues,
  group: readonly string[],
  id: string,
  section: StationSection,
  defaults?: ConfigValues,
): ConfigValues {
  const others = group.filter((other) => other !== id);
  const [source] = followers(config, others, section, defaults);
  if (!source) return config;
  if (section === "schedule") {
    return withStationBlocks(config, [id], config.station.stations[source].schedule);
  }
  const structure = pickStructure(config.station.stations[source].structure);
  return updateStations(config, [id], (station) => ({
    ...station,
    structure: { ...station.structure, ...structure },
  }));
}
