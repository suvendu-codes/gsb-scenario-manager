import { STATION_IDS } from "./catalog";
import { operationsCatalog, SCHEDULER_WEIGHTS } from "./schema";
import type { ConfigIssue, ConfigValues, StationConfig } from "./types";
import type { ScenarioDatasets } from "@/features/scenario-setup/types";
import { REQUIRED_SLOTS } from "@/features/scenario-setup/constants";

/** Float tolerance when comparing sums of half-hour periods. */
const EPSILON = 1e-9;

/**
 * How many times a tea break of this length can happen in a period of this length (1 to 6).
 *
 * @param blockHours - Length of the schedule period, in hours.
 * @param durationMinutes - Length of one tea break, in minutes.
 */
export function maxTeaCount(blockHours: number, durationMinutes: number): number {
  const minutes = Math.max(5, durationMinutes);
  return Math.max(1, Math.min(6, Math.floor((blockHours * 60) / minutes) || 1));
}

/** Put flow ids that can be chosen for a side of a put category. */
function allowedPutFlows(category: string, side: "front" | "back"): string[] {
  const flows = operationsCatalog.put.categories.find((c) => c.value === category)?.flows;
  return (flows?.[side] ?? []).map((flow) => flow.id);
}

function stationProblems(id: string, station: StationConfig, runDurationHours: number): string[] {
  const problems: string[] = [];

  const total = station.schedule.reduce((sum, block) => sum + block.hours, 0);
  if (Math.abs(total - runDurationHours) > EPSILON) {
    problems.push(`${id}: the schedule adds up to ${total}h, but the run is ${runDurationHours}h.`);
  }

  for (const block of station.schedule) {
    for (const tea of block.teaBreaks) {
      const longest = Math.min(120, Math.max(5, Math.floor(block.hours * 60)));
      if (tea.durationMinutes > longest) {
        problems.push(`${id}: a tea break is longer than its ${block.hours}h period.`);
      } else if (tea.count > maxTeaCount(block.hours, tea.durationMinutes)) {
        problems.push(
          `${id}: too many tea breaks of ${tea.durationMinutes} min in ${block.hours}h.`,
        );
      }
    }
  }

  const { frontPositions, staffedFrontPositions } = station.structure;
  if (staffedFrontPositions > frontPositions) {
    problems.push(`${id}: more staffed positions than front positions.`);
  }

  const { category, sides, behavior } = station.operations.put;
  const usedSides = category === "put" ? sides : (["back"] as const);
  for (const side of usedSides) {
    const flow = behavior[side];
    if (flow !== null && !allowedPutFlows(category, side).includes(flow)) {
      problems.push(`${id}: "${flow}" is not a ${side} put flow for ${category}.`);
    }
  }
  return problems;
}

/**
 * Checks the rules that span several values, which the schema alone can't express: every
 * station schedule fills the run, tea breaks fit their period, the data window is not empty,
 * and the All-stations lists only name real stations.
 *
 * @param values - The effective config.
 * @param runDurationHours - How long the run is.
 * @returns Human-readable problems; empty when the config is consistent.
 */
export function validateConfig(values: ConfigValues, runDurationHours: number): string[] {
  const problems: string[] = [];
  const { wms, station } = values;

  if (wms.dataWindow.startHour >= wms.dataWindow.endHour) {
    problems.push("The data window must start before it ends.");
  }
  if (new Set(wms.orderTypes).size !== wms.orderTypes.length) {
    problems.push("Order types can't be listed twice.");
  }
  if (SCHEDULER_WEIGHTS.every((key) => station.global.pickScheduler.weights[key] === 0)) {
    problems.push("The pick scheduler weights can't all be 0.");
  }

  for (const id of STATION_IDS) {
    problems.push(...stationProblems(id, station.stations[id], runDurationHours));
  }
  for (const section of ["schedule", "structure"] as const) {
    for (const list of [station.apply[section], station.override[section]]) {
      const unknown = list.filter((id) => !STATION_IDS.includes(id));
      if (unknown.length > 0) problems.push(`Unknown station: ${unknown.join(", ")}.`);
      if (new Set(list).size !== list.length) problems.push(`A station is listed twice.`);
    }
  }
  return problems;
}

/** True when the required datasets are attached and valid, and the optional one is valid if present. */
function datasetsReady(datasets: ScenarioDatasets): boolean {
  return (Object.keys(datasets) as Array<keyof ScenarioDatasets>).every((slot) => {
    const record = datasets[slot];
    if (REQUIRED_SLOTS.includes(slot)) return record !== null && record.valid;
    return record === null || record.valid;
  });
}

/**
 * The problems that would stop the scenario from running.
 *
 * @param values - The effective config.
 * @param datasets - The scenario's datasets.
 */
export function computeIssues(values: ConfigValues, datasets: ScenarioDatasets): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  if (!datasetsReady(datasets)) {
    issues.push({
      module: "datasets",
      message: "A dataset is missing or doesn’t match the site map",
    });
  }
  if (values.wms.orderTypes.length === 0) {
    issues.push({ module: "wms", message: "Choose at least one order type" });
  }

  const stations = Object.entries(values.station.stations);
  if (stations.every(([, s]) => s.schedule.every((block) => block.mode === "off"))) {
    issues.push({ module: "station", message: "No station is scheduled to work" });
  }
  for (const [id, station] of stations) {
    if (!station.schedule.some((block) => block.mode === "put")) continue;
    const { category, sides, behavior } = station.operations.put;
    const usedSides = category === "put" ? sides : (["back"] as const);
    if (usedSides.some((side) => !behavior[side])) {
      issues.push({ module: "station", message: `${id} has no put behaviour` });
    }
  }

  if (values.agent.fleet.htm + values.agent.fleet.vtm === 0) {
    issues.push({ module: "agent", message: "The fleet has no bots" });
  }
  return issues;
}
