import { request } from "@/lib/api/client";

import { scenarioListSchema } from "./schema";
import type { Scenario } from "./types";

/**
 * Fetches all scenarios (`GET /scenarios`).
 *
 * @returns The list of scenarios.
 * @throws {ApiError} If the request fails or the response is not a valid scenario list.
 */
export function getScenarios(): Promise<Scenario[]> {
  return request("/scenarios", scenarioListSchema);
}
