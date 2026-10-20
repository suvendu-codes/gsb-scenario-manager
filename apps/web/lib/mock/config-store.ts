import { STATION_IDS } from "@/features/scenario-config/catalog";
import { buildDefaults, DEFAULT_RUN_DURATION_HOURS } from "@/features/scenario-config/defaults";
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
import { computeIssues, validateConfig } from "@/features/scenario-config/validation";

import { getScenarioDetail, MockApiError } from "./store";

/**
 * In-memory mock of the scenario config, standing in for core-service until its endpoints
 * exist. Only the overrides are stored; the defaults are built on every request.
 */
type ConfigState = { overrides: Overrides; updatedAt: string };

// Kept on globalThis so config edits survive dev hot reloads, like the scenarios do.
const globalStore = globalThis as typeof globalThis & {
  mockConfigs?: Record<string, ConfigState>;
};
const configs: Record<string, ConfigState> = (globalStore.mockConfigs ??= {});

/** Puts list values in their canonical order, so equal lists compare equal. */
function normalise(path: string, value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  if (path === "wms.orderTypes") {
    return [...value].sort(
      (a, b) =>
        ORDER_TYPES.indexOf(a as (typeof ORDER_TYPES)[number]) -
        ORDER_TYPES.indexOf(b as (typeof ORDER_TYPES)[number]),
    );
  }
  if (path.startsWith("station.apply.") || path.startsWith("station.override.")) {
    return [...value].sort(
      (a, b) => STATION_IDS.indexOf(String(a)) - STATION_IDS.indexOf(String(b)),
    );
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
  return toResponse(id, state, buildDefaults(), detail.datasets);
}

/**
 * Changes a draft scenario's config. `reset` runs first, then `set`. The whole result is
 * checked before anything is stored; a value equal to its default is not kept as an override.
 *
 * @param id - The scenario id.
 * @param body - Values to set by path, and paths (or prefixes) to reset to their defaults.
 * @returns The updated config.
 * @throws {MockApiError} 404 for an unknown scenario, 409 if the scenario is not a draft, 400 for
 *   an unknown path, a path that is not a single value, or a value that makes the config invalid.
 */
export function patchScenarioConfig(id: string, body: PatchConfigBody): ScenarioConfig {
  const detail = getScenarioDetail(id);
  if (detail.status !== "draft") {
    throw new MockApiError(409, "Only draft scenarios can be edited.");
  }

  const defaults = buildDefaults();
  const next: Overrides = { ...(configs[id]?.overrides ?? {}) };

  for (const path of body.reset ?? []) {
    if (!hasPath(defaults, path)) throw new MockApiError(400, `Unknown config path: ${path}`);
    for (const key of Object.keys(next)) {
      if (key === path || key.startsWith(`${path}.`)) delete next[key];
    }
  }

  const setPaths = Object.keys(body.set ?? {});
  for (const path of setPaths) {
    if (!isLeafPath(defaults, path)) {
      throw new MockApiError(400, `Can't set ${path}: it is not a single config value.`);
    }
    next[path] = normalise(path, (body.set ?? {})[path]);
  }

  const parsed = configValuesSchema.safeParse(resolveConfig(defaults, next));
  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    throw new MockApiError(400, `${issue.path.join(".")}: ${issue.message}`);
  }
  const [problem] = validateConfig(parsed.data, DEFAULT_RUN_DURATION_HOURS);
  if (problem) throw new MockApiError(400, problem);

  for (const path of setPaths) {
    if (deepEqual(next[path], getAtPath(defaults, path))) delete next[path];
  }

  const state: ConfigState = { overrides: next, updatedAt: new Date().toISOString() };
  configs[id] = state;
  return toResponse(id, state, defaults, detail.datasets);
}
