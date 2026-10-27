"use client";

import { useQuery, type QueryClient, type UseQueryResult } from "@tanstack/react-query";

import { configApi } from "./api";
import type { SessionSource } from "./state/edit-session";
import type { ConfigCatalog, ScenarioConfig } from "./types";

/** Query keys for the scenario config. */
export const configKeys = {
  catalog: ["config", "catalog"] as const,
  scenario: (scenarioId: string) => ["config", "scenario", scenarioId] as const,
};

/**
 * Loads the field definitions the config panel is built from. They don't change while the app
 * is open, so they are fetched once.
 */
export function useConfigCatalog(): UseQueryResult<ConfigCatalog, Error> {
  return useQuery({
    queryKey: configKeys.catalog,
    queryFn: () => configApi.getCatalog(),
    staleTime: Infinity,
  });
}

/**
 * Loads a scenario's config: defaults, overrides and issues.
 *
 * @param scenarioId - The scenario id.
 */
export function useScenarioConfig(scenarioId: string): UseQueryResult<ScenarioConfig, Error> {
  return useQuery({
    queryKey: configKeys.scenario(scenarioId),
    queryFn: () => configApi.getScenarioConfig(scenarioId),
  });
}

/**
 * How an edit session saves and reloads one scenario's config. Both answers are written to the
 * cached config, so other readers of `useScenarioConfig` see what the server has.
 *
 * @param queryClient - The app's query client.
 * @param scenarioId - The scenario id.
 */
export function scenarioConfigSource(queryClient: QueryClient, scenarioId: string): SessionSource {
  const key = configKeys.scenario(scenarioId);
  return {
    save: async (patch) => {
      const saved = await configApi.patchScenarioConfig(scenarioId, patch);
      queryClient.setQueryData(key, saved);
      return saved;
    },
    load: () =>
      queryClient.fetchQuery({
        queryKey: key,
        queryFn: () => configApi.getScenarioConfig(scenarioId),
        staleTime: 0,
      }),
  };
}
