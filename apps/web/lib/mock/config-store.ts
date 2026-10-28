import {
  deepEqual,
  getAtPath,
  hasPath,
  isLeafPath,
  resolveConfig,
} from "@/features/scenario-config/paths";
import { configValuesSchema, ORDER_TYPES } from "@/features/scenario-config/schema";
import type {
  ConfigValues,
  Overrides,
  PatchConfigBody,
  ScenarioConfig,
} from "@/features/scenario-config/types";
import { configProblem } from "@/features/scenario-config/problems";
import { computeIssues, validateConfig } from "@/features/scenario-config/validation";
import { summarizeProblems, type Problem } from "@/lib/api/error";

import { allowedModesForMap, DEFAULT_RUN_DURATION_HOURS, defaultsForMap } from "./defaults";
import { getScenarioDetail, MockApiError } from "./store";

/**
 * In-memory mock of the scenario config, standing in for core-service until its endpoints
 * exist. Only the overrides are stored; the defaults are built on every request from the
 * scenario's map (its stations and the sizer's fleet, from `lib/mock/data`).
 */
type ConfigState = { overrides: Overrides; updatedAt: string };

// Kept on globalThis so config edits survive dev hot reloads, like the scenarios do.
const globalStore = globalThis as typeof globalThis & {
  mockConfigs?: Record<string, ConfigState>;
};
const configs: Record<string, ConfigState> = (globalStore.mockConfigs ??= {});

/** Puts list values in their canonical order (stations in map order), so equal lists compare equal. */
function normalise(path: string, value: unknown, stationIds: string[]): unknown {
  if (!Array.isArray(value)) return value;
  if (path === "wms.orderTypes") {
    return [...value].sort(
      (a, b) =>
        ORDER_TYPES.indexOf(a as (typeof ORDER_TYPES)[number]) -
        ORDER_TYPES.indexOf(b as (typeof ORDER_TYPES)[number]),
    );
  }
  if (path.startsWith("station.apply.") || path.startsWith("station.override.")) {
    return [...value].sort((a, b) => stationIds.indexOf(String(a)) - stationIds.indexOf(String(b)));
  }
  return value;
}

function toResponse(
  scenarioId: string,
  state: ConfigState,
  defaults: ConfigValues,
  datasets: Parameters<typeof computeIssues>[1],
): ScenarioConfig {
  return {
    scenarioId,
    updatedAt: state.updatedAt,
    runDurationHours: DEFAULT_RUN_DURATION_HOURS,
    defaults,
    overrides: state.overrides,
    issues: computeIssues(resolveConfig(defaults, state.overrides), datasets),
  };
}

/**
 * Returns a scenario's config: the defaults, the overrides on top of them, and the problems
 * that would stop the run.
 *
 * @param id - The scenario id.
 * @throws {MockApiError} 404 if there is no such scenario.
 */
export function getScenarioConfig(id: string): ScenarioConfig {
  const detail = getScenarioDetail(id);
  const state = configs[id] ?? { overrides: {}, updatedAt: detail.createdAt };
  return toResponse(id, state, defaultsForMap(detail.mapId), detail.datasets);
}

/** The error for a change that has problems: every problem is listed, none is hidden. */
function configInvalid(problems: Problem[]): MockApiError {
  return new MockApiError(400, summarizeProblems(problems), { code: "CONFIG_INVALID", problems });
}

/**
 * Changes a draft scenario's config. `reset` runs first, then `set`. The whole result is
 * checked before anything is stored; a value equal to its default is not kept as an override.
 *
 * There is no concurrency control: array overrides (a schedule, the order types, the apply and
 * override lists) are replaced whole, so with two tabs the last write wins. The response
 * carries `updatedAt`, so a precondition (`If-Match` or an `updatedAt` check, answering 409)
 * can be added without changing the contract. Which one is core-service's call, so it is not
 * built into the mock (review S3, deferred).
 *
 * @param id - The scenario id.
 * @param body - Values to set by path, and paths (or prefixes) to reset to their defaults.
 * @returns The updated config.
 * @throws {MockApiError} 404 for an unknown scenario, 409 (`SCENARIO_NOT_EDITABLE`) if the
 *   scenario is not a draft, and 400 (`CONFIG_INVALID`) listing every problem found: unknown
 *   paths, paths that are not a single value, values that break the schema, and rules that span
 *   several values.
 */
export function patchScenarioConfig(id: string, body: PatchConfigBody): ScenarioConfig {
  const detail = getScenarioDetail(id);
  if (detail.status !== "draft") {
    throw new MockApiError(409, "Only draft scenarios can be edited.", {
      code: "SCENARIO_NOT_EDITABLE",
      params: { status: detail.status },
    });
  }

  const defaults = defaultsForMap(detail.mapId);
  const stationIds = Object.keys(defaults.station.stations);
  const next: Overrides = { ...(configs[id]?.overrides ?? {}) };
  const problems: Problem[] = [];

  for (const path of body.reset ?? []) {
    if (!hasPath(defaults, path)) {
      problems.push(configProblem("UNKNOWN_PATH", { path }, path));
      continue;
    }
    for (const key of Object.keys(next)) {
      if (key === path || key.startsWith(`${path}.`)) delete next[key];
    }
  }

  const setPaths = Object.keys(body.set ?? {});
  for (const path of setPaths) {
    if (!hasPath(defaults, path)) {
      problems.push(configProblem("UNKNOWN_PATH", { path }, path));
    } else if (!isLeafPath(defaults, path)) {
      problems.push(configProblem("NOT_A_SINGLE_VALUE", { path }, path));
    } else {
      next[path] = normalise(path, (body.set ?? {})[path], stationIds);
    }
  }
  if (problems.length > 0) throw configInvalid(problems);

  const parsed = configValuesSchema.safeParse(resolveConfig(defaults, next));
  if (!parsed.success) {
    throw configInvalid(
      parsed.error.issues.map((issue) =>
        configProblem("INVALID_VALUE", { reason: issue.message }, issue.path.join(".")),
      ),
    );
  }
  const crossField = validateConfig(
    parsed.data,
    DEFAULT_RUN_DURATION_HOURS,
    allowedModesForMap(detail.mapId),
  );
  if (crossField.length > 0) throw configInvalid(crossField);

  for (const path of setPaths) {
    if (deepEqual(next[path], getAtPath(defaults, path))) delete next[path];
  }

  const state: ConfigState = { overrides: next, updatedAt: new Date().toISOString() };
  configs[id] = state;
  return toResponse(id, state, defaults, detail.datasets);
}
