import type { Problem } from "@/lib/api/error";

import { configProblem } from "./problems";
import { operationsCatalog, SCHEDULER_WEIGHTS } from "./schema";
import type { ConfigIssue, ConfigValues, StationConfig, StationMode } from "./types";
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

/** The modes each station may work in, by station id, as the site registry says. */
export type AllowedModes = Record<string, readonly StationMode[]>;

/**
 * How many times a regular break every `everyHours` happens in a block of `blockHours`: inside
 * the block, never on its end.
 */
export function breaksInBlock(everyHours: number, blockHours: number): number {
  if (everyHours <= 0) return 0;
  return Math.max(0, Math.ceil(blockHours / everyHours - 1e-9) - 1);
}

/** Longest tea break a block of this length can hold, in minutes (at most 60). */
export function maxTeaMinutes(blockHours: number): number {
  return Math.min(60, Math.max(5, Math.floor(blockHours * 60)));
}

function scheduleProblems(
  id: string,
  station: StationConfig,
  runDurationHours: number,
  allowed: readonly StationMode[] | undefined,
): Problem[] {
  const problems: Problem[] = [];
  const at = `station.stations.${id}.schedule`;
  if (station.schedule.length === 0) return problems;

  // The run length is fixed at 8h for now; see DEFAULT_RUN_DURATION_HOURS (lib/mock/defaults.ts)
  // for how a change of length is meant to be migrated.
  const total = station.schedule.reduce((sum, block) => sum + block.hours, 0);
  if (Math.abs(total - runDurationHours) > EPSILON) {
    problems.push(
      configProblem(
        "SCHEDULE_TOTAL_MISMATCH",
        { stationId: id, actualHours: total, expectedHours: runDurationHours },
        at,
      ),
    );
  }

  const seen = new Set<StationMode>();
  for (const block of station.schedule) {
    if (seen.has(block.mode)) {
      problems.push(
        configProblem("SCHEDULE_MODE_REPEATED", { stationId: id, mode: block.mode }, at),
      );
    }
    seen.add(block.mode);
    if (allowed && !allowed.includes(block.mode)) {
      problems.push(configProblem("MODE_NOT_ALLOWED", { stationId: id, mode: block.mode }, at));
    }

    // Total break time across the block, as the breaks would place it.
    let breakHours = 0;
    for (const item of block.breaks) {
      if (item.type === "break") {
        breakHours += breaksInBlock(item.everyHours, block.hours) * item.durationHours;
        if (item.durationHours >= item.everyHours) {
          problems.push(
            configProblem(
              "BREAK_LONGER_THAN_INTERVAL",
              {
                stationId: id,
                everyHours: item.everyHours,
                durationHours: item.durationHours,
              },
              at,
            ),
          );
        }
        // A break every N hours in an N-hour block never happens (it would fall on the end).
        if (item.everyHours >= block.hours) {
          problems.push(
            configProblem(
              "BREAK_EVERY_TOO_LONG",
              { stationId: id, periodHours: block.hours, everyHours: item.everyHours },
              at,
            ),
          );
        }
        continue;
      }
      breakHours += (item.count * item.durationMinutes) / 60;
      const params = {
        stationId: id,
        periodHours: block.hours,
        durationMinutes: item.durationMinutes,
      };
      if (item.durationMinutes > maxTeaMinutes(block.hours)) {
        problems.push(configProblem("TEA_BREAK_TOO_LONG", params, at));
      } else if (item.count > maxTeaCount(block.hours, item.durationMinutes)) {
        problems.push(configProblem("TEA_BREAK_TOO_MANY", { ...params, count: item.count }, at));
      }
    }
    if (block.breaks.length > 0 && breakHours >= block.hours - EPSILON) {
      problems.push(
        configProblem(
          "BREAKS_EXCEED_BLOCK",
          { stationId: id, periodHours: block.hours, breakHours },
          at,
        ),
      );
    }
  }
  return problems;
}

function stationProblems(
  id: string,
  station: StationConfig,
  runDurationHours: number,
  allowed: readonly StationMode[] | undefined,
): Problem[] {
  const problems = scheduleProblems(id, station, runDurationHours, allowed);
  const at = `station.stations.${id}`;

  const { frontPositions, staffedFrontPositions } = station.structure;
  if (staffedFrontPositions > frontPositions) {
    problems.push(
      configProblem(
        "STAFFED_POSITIONS_EXCEED",
        { stationId: id, staffedPositions: staffedFrontPositions, frontPositions },
        `${at}.structure.staffedFrontPositions`,
      ),
    );
  }

  const { category, sides, behavior } = station.operations.put;
  const usedSides = category === "put" ? sides : (["back"] as const);
  for (const side of usedSides) {
    const flow = behavior[side];
    if (flow !== null && !allowedPutFlows(category, side).includes(flow)) {
      problems.push(
        configProblem(
          "PUT_FLOW_NOT_ALLOWED",
          { stationId: id, flowId: flow, side, category },
          `${at}.operations.put.behavior.${side}`,
        ),
      );
    }
  }
  return problems;
}

/**
 * Checks the rules that span several values, which the schema alone can't express: every
 * assigned station schedule fills the run with one block per mode, its breaks fit their blocks,
 * and the data window is not empty. Every problem found is returned, not only the first.
 *
 * @param values - The effective config.
 * @param runDurationHours - How long the run is.
 * @param allowedModes - The modes each station may work in, when known (the server knows them
 *   from the site registry); a station not listed is not checked.
 * @returns The problems, each with a stable code, params and the path of the value it is about;
 *   empty when the config is consistent.
 */
export function validateConfig(
  values: ConfigValues,
  runDurationHours: number,
  allowedModes: AllowedModes = {},
): Problem[] {
  const problems: Problem[] = [];
  const { wms, station } = values;

  if (wms.dataWindow.startHour >= wms.dataWindow.endHour) {
    problems.push(configProblem("DATA_WINDOW_EMPTY", wms.dataWindow, "wms.dataWindow"));
  }
  if (new Set(wms.orderTypes).size !== wms.orderTypes.length) {
    problems.push(configProblem("ORDER_TYPES_DUPLICATE", {}, "wms.orderTypes"));
  }
  if (SCHEDULER_WEIGHTS.every((key) => station.global.pickScheduler.weights[key] === 0)) {
    problems.push(
      configProblem("SCHEDULER_WEIGHTS_ALL_ZERO", {}, "station.global.pickScheduler.weights"),
    );
  }

  const stationIds = Object.keys(station.stations);
  for (const id of stationIds) {
    problems.push(...stationProblems(id, station.stations[id], runDurationHours, allowedModes[id]));
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
 * The problems that would stop the scenario from running. Each has a stable code and the module
 * it belongs to.
 *
 * @param values - The effective config.
 * @param datasets - The scenario's datasets.
 */
export function computeIssues(values: ConfigValues, datasets: ScenarioDatasets): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  const issue = (module: ConfigIssue["module"], problem: Problem): void => {
    issues.push({ module, ...problem });
  };

  if (!datasetsReady(datasets)) {
    issue("datasets", configProblem("DATASET_MISSING_OR_INVALID", {}));
  }
  if (values.wms.orderTypes.length === 0) {
    issue("wms", configProblem("NO_ORDER_TYPE", {}, "wms.orderTypes"));
  }

  const stations = Object.entries(values.station.stations);
  if (stations.every(([, s]) => s.schedule.length === 0)) {
    issue("station", configProblem("NO_STATION_SCHEDULED", {}));
  }
  for (const [id, station] of stations) {
    if (!station.schedule.some((block) => block.mode === "put")) continue;
    const { category, sides, behavior } = station.operations.put;
    const usedSides = category === "put" ? sides : (["back"] as const);
    if (usedSides.some((side) => !behavior[side])) {
      issue(
        "station",
        configProblem(
          "PUT_FLOW_MISSING",
          { stationId: id },
          `station.stations.${id}.operations.put`,
        ),
      );
    }
  }

  if (values.agent.fleet.htm + values.agent.fleet.vtm === 0) {
    issue("agent", configProblem("NO_BOTS", {}, "agent.fleet"));
  }
  return issues;
}
