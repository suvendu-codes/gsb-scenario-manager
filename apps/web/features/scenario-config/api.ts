import { request } from "@/lib/api/client";

import { configCatalogSchema } from "./catalog/schema";
import { scenarioConfigSchema } from "./schema";
import type { ConfigCatalog, PatchConfigBody, ScenarioConfig } from "./types";

/** Fetches the field definitions the config panel is built from (`GET /config/catalog`). */
export function getConfigCatalog(): Promise<ConfigCatalog> {
  return request("/config/catalog", configCatalogSchema);
}

/**
 * Fetches a scenario's config (`GET /scenarios/{id}/config`).
 *
 * @param scenarioId - The scenario id.
 * @throws {ApiError} With status 404 if the scenario does not exist.
 */
export function getScenarioConfig(scenarioId: string): Promise<ScenarioConfig> {
  return request(`/scenarios/${encodeURIComponent(scenarioId)}/config`, scenarioConfigSchema);
}

/**
 * Changes a draft scenario's config (`PATCH /scenarios/{id}/config`).
 *
 * @param scenarioId - The scenario id.
 * @param body - Values to set by dot-notation path, and paths (or prefixes) to reset.
 * @returns The updated config.
 * @throws {ApiError} With status 400 for an invalid change, 404 for an unknown scenario and 409
 *   when the scenario is not a draft.
 */
export function patchScenarioConfig(
  scenarioId: string,
  body: PatchConfigBody,
): Promise<ScenarioConfig> {
  return request(`/scenarios/${encodeURIComponent(scenarioId)}/config`, scenarioConfigSchema, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
