import { request } from "@/lib/api/client";

import {
  projectListSchema,
  projectMapListSchema,
  scenarioListSchema,
  scenarioSchema,
} from "./schema";
import type { CreateScenarioInput, Project, ProjectMap, Scenario } from "./types";

/**
 * Fetches all scenarios (`GET /scenarios`).
 *
 * @returns The list of scenarios.
 * @throws {ApiError} If the request fails or the response is not a valid scenario list.
 */
export function getScenarios(): Promise<Scenario[]> {
  return request("/scenarios", scenarioListSchema);
}

/**
 * Fetches all projects (`GET /projects`).
 *
 * @returns The list of projects.
 * @throws {ApiError} If the request fails or the response is not a valid project list.
 */
export function getProjects(): Promise<Project[]> {
  return request("/projects", projectListSchema);
}

/**
 * Fetches the maps of one project (`GET /projects/{id}/maps`).
 *
 * @param projectId - Id of the project whose maps to load.
 * @returns The list of maps in that project.
 * @throws {ApiError} If the request fails or the response is not a valid map list.
 */
export function getProjectMaps(projectId: string): Promise<ProjectMap[]> {
  return request(`/projects/${encodeURIComponent(projectId)}/maps`, projectMapListSchema);
}

/**
 * Creates a new draft scenario (`POST /scenarios`).
 *
 * @param input - Project, map and name for the new scenario.
 * @returns The created scenario.
 * @throws {ApiError} With status 409 if the name is already used on that map, or 400 if the input is invalid.
 */
export function createScenario(input: CreateScenarioInput): Promise<Scenario> {
  return request("/scenarios", scenarioSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/**
 * Edits a draft scenario's project, map and name (`PATCH /scenarios/{id}`).
 *
 * @param id - Id of the scenario to edit.
 * @param input - The new project, map and name.
 * @returns The updated scenario.
 * @throws {ApiError} With status 409 if the name is taken on that map or the scenario is not a draft,
 *   or 404 if the scenario, project or map does not exist.
 */
export function updateScenario(id: string, input: CreateScenarioInput): Promise<Scenario> {
  return request(`/scenarios/${encodeURIComponent(id)}`, scenarioSchema, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
