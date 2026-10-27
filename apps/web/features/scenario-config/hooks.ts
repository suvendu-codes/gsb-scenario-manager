"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { configApi } from "./api";
import type { ConfigCatalog, PatchConfigBody, ScenarioConfig } from "./types";

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
 * Sends a config change and stores the server's answer in the cached config.
 *
 * @param scenarioId - The scenario id.
 * @returns The mutation result; call `mutateAsync` with the patch.
 */
export function useUpdateScenarioConfig(
  scenarioId: string,
): UseMutationResult<ScenarioConfig, Error, PatchConfigBody> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: PatchConfigBody) => configApi.patchScenarioConfig(scenarioId, patch),
    onSuccess: (config) => {
      queryClient.setQueryData(configKeys.scenario(scenarioId), config);
    },
  });
}
