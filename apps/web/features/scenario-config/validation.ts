import type { Problem } from "@/lib/api/error";

import { STATION_IDS } from "./catalog";
import { configProblem } from "./problems";
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

function stationProblems(id: string, station: StationConfig, runDurationHours: number): Problem[] {
  const problems: Problem[] = [];
  const at = `station.stations.${id}`;

  // The run length is fixed at 8h for now; see DEFAULT_RUN_DURATION_HOURS for how a change of
  // length is meant to be migrated.
  const total = station.schedule.reduce((sum, block) => sum + block.hours, 0);
  if (Math.abs(total - runDurationHours) > EPSILON) {
    problems.push(
      configProblem(
        "SCHEDULE_TOTAL_MISMATCH",
        { stationId: id, actualHours: total, expectedHours: runDurationHours },
        `${at}.schedule`,
      ),
    );
  }

  for (const block of station.schedule) {
    for (const tea of block.teaBreaks) {
      const longest = Math.min(120, Math.max(5, Math.floor(block.hours * 60)));
      const params = {
        stationId: id,
        periodHours: block.hours,
        durationMinutes: tea.durationMinutes,
      };
      if (tea.durationMinutes > longest) {
        problems.push(configProblem("TEA_BREAK_TOO_LONG", params, `${at}.schedule`));
      } else if (tea.count > maxTeaCount(block.hours, tea.durationMinutes)) {
        problems.push(
          configProblem("TEA_BREAK_TOO_MANY", { ...params, count: tea.count }, `${at}.schedule`),
        );
      }
    }
  }

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
 * station schedule fills the run, tea breaks fit their period, the data window is not empty,
 * and the All-stations lists only name real stations. Every problem found is returned, not
 * only the first.
 *
 * @param values - The effective config.
 * @param runDurationHours - How long the run is.
 * @returns The problems, each with a stable code, params and the path of the value it is about;
 *   empty when the config is consistent.
 */
export function validateConfig(values: ConfigValues, runDurationHours: number): Problem[] {
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

  for (const id of STATION_IDS) {
    problems.push(...stationProblems(id, station.stations[id], runDurationHours));
  }
  for (const section of ["schedule", "structure"] as const) {
    for (const kind of ["apply", "override"] as const) {
      const list = station[kind][section];
      const path = `station.${kind}.${section}`;
      const unknown = list.filter((id) => !STATION_IDS.includes(id));
      if (unknown.length > 0) {
        problems.push(
          configProblem(
            "UNKNOWN_STATION",
            { list: kind, section, stationIds: unknown.join(", ") },
            path,
          ),
        );
      }
      if (new Set(list).size !== list.length) {
        problems.push(configProblem("STATION_LISTED_TWICE", { list: kind, section }, path));
      }
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
  if (stations.every(([, s]) => s.schedule.every((block) => block.mode === "off"))) {
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
