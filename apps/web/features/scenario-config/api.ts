import { z } from "zod";

import { request } from "@/lib/api/client";

import { configCatalogResponseSchema, scenarioConfigResponseSchema } from "./response-schemas";
import type { ConfigCatalog, PatchConfigBody, ScenarioConfig } from "./types";
import { fromSizer, type MapFleet } from "./upstream/fleet";
import { fromUpstreamPps, type MapStations } from "./upstream/stations";

/** Which map a lookup is for; `mapVersion` is passed on as it is when given. */
export type MapRef = { projectId: string; mapId: string; mapVersion?: string };

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
  /**
   * The map's stations, from the site registry (`GET /projects/{p}/maps/{m}/pps`).
   *
   * @throws {ApiError} With status 404 for an unknown project or map.
   */
  getMapStations(map: MapRef): Promise<MapStations>;
  /**
   * The map's bot types and the sizer's counts (`GET /projects/{p}/maps/{m}/sizer`).
   *
   * @throws {ApiError} With status 404 for an unknown project or map.
   */
  getMapFleet(map: MapRef): Promise<MapFleet>;
};

const configPath = (scenarioId: string) => `/scenarios/${encodeURIComponent(scenarioId)}/config`;

const mapPath = ({ projectId, mapId, mapVersion }: MapRef, lookup: "pps" | "sizer") =>
  `/projects/${encodeURIComponent(projectId)}/maps/${encodeURIComponent(mapId)}/${lookup}` +
  (mapVersion ? `?map_version=${encodeURIComponent(mapVersion)}` : "");

/** A response schema that reads the body with a mapper; null from the mapper fails parsing. */
const mapped = <T>(read: (body: unknown) => T | null, what: string) =>
  z.unknown().transform((body, ctx): T => {
    const result = read(body);
    if (result === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `The answer has no ${what} list.` });
      return z.NEVER;
    }
    return result;
  });

const mapStationsSchema = mapped(fromUpstreamPps, "station");
const mapFleetSchema = mapped(fromSizer, "bot type");

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
  getMapStations: (map) => request(mapPath(map, "pps"), mapStationsSchema),
  getMapFleet: (map) => request(mapPath(map, "sizer"), mapFleetSchema),
};
