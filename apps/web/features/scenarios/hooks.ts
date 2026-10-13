"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { getScenarios } from "./api";
import type { Scenario } from "./types";

/** Query keys for scenario data, so later mutations can invalidate the list. */
export const scenarioKeys = {
  list: ["scenarios", "list"] as const,
};

/**
 * Loads the scenario list with TanStack Query.
 * Retries once on failure so the error state appears quickly.
 *
 * @returns The query result: `data`, `isPending`, `isError`, `error` and `refetch`.
 */
export function useScenarios(): UseQueryResult<Scenario[], Error> {
  return useQuery({
    queryKey: scenarioKeys.list,
    queryFn: getScenarios,
    retry: 1,
  });
}
