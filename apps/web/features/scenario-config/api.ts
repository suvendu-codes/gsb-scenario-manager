import { request } from "@/lib/api/client";

import { configCatalogResponseSchema, scenarioConfigResponseSchema } from "./response-schemas";
import type { ConfigCatalog, PatchConfigBody, ScenarioConfig } from "./types";

/**
 * What the config page needs from the API. The real service is still being designed, so this
 * is the only place that knows the URLs; `api-contract.ts` states what each call must do, and
 * the same contract suite runs against the mock and, later, the real service.
 */
export type ConfigApi = {
  /** The field definitions the config panel is built from (`GET /config/catalog`). */
  getCatalog(): Promise<ConfigCatalog>;
  /**
   * A scenario's config (`GET /scenarios/{id}/config`).
   *
   * @throws {ApiError} With status 404 if the scenario does not exist.
   */
  getScenarioConfig(scenarioId: string): Promise<ScenarioConfig>;
  /**
   * Changes a draft scenario's config (`PATCH /scenarios/{id}/config`): values to set by
   * dot-notation path, and paths (or prefixes) to reset.
   *
   * @returns The updated config.
   * @throws {ApiError} With a 4xx status listing every problem for an invalid change, 404 for an
   *   unknown scenario and 409 when the scenario is not a draft.
   */
  patchScenarioConfig(scenarioId: string, body: PatchConfigBody): Promise<ScenarioConfig>;
};

const configPath = (scenarioId: string) => `/scenarios/${encodeURIComponent(scenarioId)}/config`;

/** The config API over HTTP, at `API_BASE_URL`. Responses are read tolerantly. */
export const configApi: ConfigApi = {
  getCatalog: () => request("/config/catalog", configCatalogResponseSchema),
  getScenarioConfig: (scenarioId) => request(configPath(scenarioId), scenarioConfigResponseSchema),
  patchScenarioConfig: (scenarioId, body) =>
    request(configPath(scenarioId), scenarioConfigResponseSchema, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
};
