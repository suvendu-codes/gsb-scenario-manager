"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { createScenario, getProjectMaps, getProjects, getScenarios } from "./api";
import type { CreateScenarioInput, Project, ProjectMap, Scenario } from "./types";

/** Query keys for scenario data, so mutations can invalidate the right queries. */
export const scenarioKeys = {
  list: ["scenarios", "list"] as const,
  projects: ["projects"] as const,
  maps: (projectId: string) => ["projects", projectId, "maps"] as const,
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

/**
 * Loads the projects for the Project dropdown.
 *
 * @returns The query result for the project list.
 */
export function useProjects(): UseQueryResult<Project[], Error> {
  return useQuery({
    queryKey: scenarioKeys.projects,
    queryFn: getProjects,
    retry: 1,
  });
}

/**
 * Loads the maps of a project for the Map dropdown.
 * Does nothing until a project is selected.
 *
 * @param projectId - The selected project id, or an empty string when none is selected.
 * @returns The query result for that project's maps.
 */
export function useProjectMaps(projectId: string): UseQueryResult<ProjectMap[], Error> {
  return useQuery({
    queryKey: scenarioKeys.maps(projectId),
    queryFn: () => getProjectMaps(projectId),
    enabled: projectId !== "",
    retry: 1,
  });
}

/**
 * Creates a scenario and refreshes the scenario list when it succeeds.
 *
 * @returns The mutation result; call `mutate` or `mutateAsync` with the form values.
 */
export function useCreateScenario(): UseMutationResult<Scenario, Error, CreateScenarioInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createScenario,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scenarioKeys.list }),
  });
}
