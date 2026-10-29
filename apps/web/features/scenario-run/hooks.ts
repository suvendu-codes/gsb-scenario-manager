"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/errors";
import { scenarioKeys } from "@/features/scenarios/hooks";

import { runApi } from "./api";
import { isFinished, type Run } from "./schema";

/** How often a running scenario's state is checked, as the API design suggests. */
export const RUN_POLL_MS = 15_000;

export const runKeys = {
  scenario: (scenarioId: string) => ["runs", "scenario", scenarioId] as const,
};

/**
 * The run of a scenario that is not a draft, checked every 15 seconds until it ends. Null when
 * the scenario has not been run.
 *
 * @param scenarioId - The scenario id.
 * @param enabled - Whether to look (only scenarios that are no longer drafts have a run).
 */
export function useScenarioRun(
  scenarioId: string,
  enabled: boolean,
): UseQueryResult<Run | null, Error> {
  return useQuery({
    queryKey: runKeys.scenario(scenarioId),
    enabled,
    queryFn: async () => {
      try {
        return await runApi.getScenarioRun(scenarioId);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    refetchInterval: (query) => {
      const run = query.state.data;
      return run && isFinished(run.status) ? false : RUN_POLL_MS;
    },
  });
}

/**
 * Triggers a scenario's run. One idempotency key is used per click, so a retried request can't
 * start a second run. On success the scenario (now active) and its run are reloaded.
 *
 * @param scenarioId - The scenario id.
 */
export function useTriggerRun(scenarioId: string) {
  const queryClient = useQueryClient();
  return useMutation<Run, ApiError>({
    mutationFn: () => runApi.trigger(scenarioId, crypto.randomUUID()),
    onSuccess: async (run) => {
      queryClient.setQueryData(runKeys.scenario(scenarioId), run);
      await queryClient.invalidateQueries({ queryKey: scenarioKeys.detail(scenarioId) });
      await queryClient.invalidateQueries({ queryKey: scenarioKeys.list });
    },
  });
}
