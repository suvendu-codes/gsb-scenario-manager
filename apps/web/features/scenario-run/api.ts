import { request } from "@/lib/api/client";

import { runSchema, type Run } from "./schema";

/** What the config page needs to run a scenario. */
export type RunApi = {
  /**
   * Triggers a scenario's run (`POST /scenarios/{id}/runs`). The same idempotency key returns the
   * same run, so a retried click can't start two.
   *
   * @throws {ApiError} 422 (`scenario_invalid`, with the issues as problems) when the scenario
   *   can't run yet, 409 when it is not a draft, 404 for an unknown scenario.
   */
  trigger(scenarioId: string, idempotencyKey: string): Promise<Run>;
  /**
   * The scenario's run (`GET /scenarios/{id}/run`).
   *
   * @throws {ApiError} 404 when the scenario has not been run.
   */
  getScenarioRun(scenarioId: string): Promise<Run>;
};

const scenarioPath = (scenarioId: string) => `/scenarios/${encodeURIComponent(scenarioId)}`;

/** The run API over HTTP, at `API_BASE_URL`. */
export const runApi: RunApi = {
  trigger: (scenarioId, idempotencyKey) =>
    request(`${scenarioPath(scenarioId)}/runs`, runSchema, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({}),
    }),
  getScenarioRun: (scenarioId) =>
    request(`${scenarioPath(scenarioId)}/run`, runSchema, { retry: { retries: 0 } }),
};
