import { STATION_IDS } from "../catalog";
import { deepEqual } from "../paths";
import type { ConfigValues, ScheduleBlock, StationConfig } from "../types";

/**
 * Pure edits for the Station Config module, ported from the design. Each takes a config and
 * returns a new one (the input is not changed). A station that keeps its own value for a
 * section is listed in `station.override`; an edit made for all stations skips those, and
 * `station.apply` narrows which stations an All-stations edit targets (empty means all).
 */

/** The two sections where All-stations edits skip stations that keep their own value. */
export type StationSection = "schedule" | "structure";

type Structure = StationConfig["structure"];

/** Structure values an All-stations edit can set together. */
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

function ordered(ids: readonly string[]): string[] {
  return STATION_IDS.filter((id) => ids.includes(id));
}

function withList(
  config: ConfigValues,
  kind: "apply" | "override",
  section: StationSection,
  ids: readonly string[],
): ConfigValues {
  const next = structuredClone(config);
  next.station[kind][section] = ordered(ids);
  return next;
}

/** Applies `recipe` to each listed station. Use for edits that have no override tracking. */
export function updateStations(
  config: ConfigValues,
  ids: readonly string[],
  recipe: (station: StationConfig) => StationConfig,
): ConfigValues {
  const next = structuredClone(config);
  for (const id of ids) next.station.stations[id] = recipe(next.station.stations[id]);
  return next;
}

/** The stations an All-stations edit of this section targets (all of them when none is picked). */
export function applyTargets(config: ConfigValues, section: StationSection): string[] {
  const picked = ordered(config.station.apply[section]);
  return picked.length > 0 ? picked : [...STATION_IDS];
}

/** The stations that keep their own value for this section. */
export function overriddenStations(config: ConfigValues, section: StationSection): string[] {
  return ordered(config.station.override[section]);
}

/** The stations an All-stations edit actually changes: its targets, minus those with their own value. */
export function editableStations(config: ConfigValues, section: StationSection): string[] {
  const skip = overriddenStations(config, section);
  return applyTargets(config, section).filter((id) => !skip.includes(id));
}

/** Marks a station as keeping its own value for this section. */
export function markStationOverride(
  config: ConfigValues,
  section: StationSection,
  id: string,
): ConfigValues {
  const current = overriddenStations(config, section);
  return current.includes(id) ? config : withList(config, "override", section, [...current, id]);
}

/** Lets stations follow All-stations edits again for this section. */
export function clearStationOverride(
  config: ConfigValues,
  section: StationSection,
  ids: readonly string[],
): ConfigValues {
  const keep = overriddenStations(config, section).filter((id) => !ids.includes(id));
  return withList(config, "override", section, keep);
}

/** The schedule all of these stations share, or null if they differ (or none are given). */
export function sharedBlocks(config: ConfigValues, ids: readonly string[]): ScheduleBlock[] | null {
  if (ids.length === 0) return null;
  const [first, ...rest] = ids.map((id) => config.station.stations[id].schedule);
  return rest.every((blocks) => deepEqual(blocks, first)) ? first : null;
}

function structureMatches(a: Structure, b: Structure): boolean {
  return STRUCTURE_KEYS.every((key) => a[key] === b[key]);
}

/** A station whose structure all the editable stations share, or null if they differ. */
export function sharedStructureId(config: ConfigValues): string | null {
  const ids = editableStations(config, "structure");
  if (ids.length === 0) return null;
  const stations = config.station.stations;
  return ids.every((id) => structureMatches(stations[id].structure, stations[ids[0]].structure))
    ? ids[0]
    : null;
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

/** Copies one station's structure onto others. */
export function copyStructure(
  config: ConfigValues,
  fromId: string,
  ids: readonly string[],
): ConfigValues {
  const source = config.station.stations[fromId].structure;
  return updateStations(config, ids, (station) => ({
    ...station,
    structure: { ...station.structure, ...pickStructure(source) },
  }));
}

function pickStructure(structure: Structure): Structure {
  return Object.fromEntries(STRUCTURE_KEYS.map((key) => [key, structure[key]])) as Structure;
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

/**
 * Sets the schedule of one station. If it now equals what the other editable stations share, it
 * rejoins them; otherwise it is marked as keeping its own schedule.
 */
export function writeStationSchedule(
  config: ConfigValues,
  id: string,
  blocks: ScheduleBlock[],
): ConfigValues {
  const next = withStationBlocks(config, [id], blocks);
  const others = editableStations(config, "schedule").filter((other) => other !== id);
  const shared = sharedBlocks(config, others);
  return shared && deepEqual(blocks, shared)
    ? clearStationOverride(next, "schedule", [id])
    : markStationOverride(next, "schedule", id);
}

/** Sets the schedule of every station an All-stations edit changes. */
export function writeSharedSchedule(config: ConfigValues, blocks: ScheduleBlock[]): ConfigValues {
  return withStationBlocks(config, editableStations(config, "schedule"), blocks);
}

/**
 * Gives stations the schedule of another station, and lets them follow All-stations edits.
 *
 * @param sourceId - The station to copy from.
 * @param ids - The stations to copy to; empty means all of them.
 */
export function applyStationSchedule(
  config: ConfigValues,
  sourceId: string,
  ids: readonly string[],
): ConfigValues {
  const targets = ids.length > 0 ? ids : STATION_IDS;
  const blocks = config.station.stations[sourceId].schedule;
  return clearStationOverride(withStationBlocks(config, targets, blocks), "schedule", targets);
}

/** Gives every station one station's schedule and targets all stations again. */
export function copyScheduleToAll(config: ConfigValues, sourceId: string): ConfigValues {
  const blocks = config.station.stations[sourceId].schedule;
  const next = clearStationOverride(
    withStationBlocks(config, STATION_IDS, blocks),
    "schedule",
    STATION_IDS,
  );
  return setSharedTargets(next, "schedule", STATION_IDS);
}

/**
 * Makes a station follow the shared schedule again.
 *
 * @returns The new config, or null when the other stations don't share one schedule.
 */
export function revertStationSchedule(config: ConfigValues, id: string): ConfigValues | null {
  const shared = sharedBlocks(config, editableStations(config, "schedule"));
  if (!shared) return null;
  return clearStationOverride(withStationBlocks(config, [id], shared), "schedule", [id]);
}

/**
 * Makes a station follow the shared structure again.
 *
 * @returns The new config, or null when the other stations don't share one structure.
 */
export function revertStationStructure(config: ConfigValues, id: string): ConfigValues | null {
  const ref = sharedStructureId(config);
  if (!ref) return null;
  return clearStationOverride(copyStructure(config, ref, [id]), "structure", [id]);
}

/** Changes structure values for every station an All-stations edit targets. */
export function writeSharedStructure(
  config: ConfigValues,
  patch: Partial<Structure>,
): ConfigValues {
  return updateStations(config, editableStations(config, "structure"), (station) => ({
    ...station,
    structure: normaliseStructure({ ...station.structure, ...patch }),
  }));
}

/**
 * Changes structure values for one station. If it now matches the other editable stations it
 * rejoins them; otherwise it is marked as keeping its own structure.
 */
export function writeStationStructure(
  config: ConfigValues,
  id: string,
  patch: Partial<Structure>,
): ConfigValues {
  const structure = normaliseStructure({ ...config.station.stations[id].structure, ...patch });
  const next = updateStations(config, [id], (station) => ({ ...station, structure }));

  const others = editableStations(config, "structure").filter((other) => other !== id);
  const stations = config.station.stations;
  const matchesOthers =
    others.length > 0 &&
    others.every((other) =>
      structureMatches(stations[other].structure, stations[others[0]].structure),
    ) &&
    structureMatches(structure, stations[others[0]].structure);
  return matchesOthers
    ? clearStationOverride(next, "structure", [id])
    : markStationOverride(next, "structure", id);
}

/**
 * Chooses which stations All-stations edits of a section target. Stations that join the
 * targets take the shared value and stop keeping their own. When the targets share no value,
 * the joiners keep their own value and stay marked as keeping it.
 *
 * @param ids - The chosen stations; none, or all of them, means every station.
 */
export function setSharedTargets(
  config: ConfigValues,
  section: StationSection,
  ids: readonly string[],
): ConfigValues {
  const chosen = ordered(ids);
  const nextIds = chosen.length === 0 || chosen.length === STATION_IDS.length ? [] : chosen;
  const previous = applyTargets(config, section);
  const resolved = nextIds.length > 0 ? nextIds : [...STATION_IDS];

  const out = withList(config, "apply", section, nextIds);
  const added = resolved.filter((id) => !previous.includes(id));
  if (added.length === 0) return out;

  // A joiner only loses its own value when it takes the shared one. With nothing shared to take,
  // it keeps its value and its flag, so the next All-stations edit can't overwrite it unseen.
  if (section === "schedule") {
    const shared = sharedBlocks(config, editableStations(config, "schedule"));
    if (!shared) return out;
    return clearStationOverride(withStationBlocks(out, added, shared), section, added);
  }
  const ref = sharedStructureId(config);
  if (!ref) return out;
  return clearStationOverride(copyStructure(out, ref, added), section, added);
}
