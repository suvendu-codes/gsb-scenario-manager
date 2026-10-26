"use client";

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { createScenario, getProjectMaps, getProjects, getScenarios, updateScenario } from "./api";
import type { CreateScenarioInput, Project, ProjectMap, Scenario } from "./types";

/** Query keys for scenario data, so mutations can invalidate the right queries. */
export const scenarioKeys = {
  list: ["scenarios", "list"] as const,
  detail: (scenarioId: string) => ["scenarios", "detail", scenarioId] as const,
  projects: ["projects"] as const,
  maps: (projectId: string) => ["projects", projectId, "maps"] as const,
};

/**
 * Loads the scenario list with TanStack Query.
 * Retrying on failure is handled by the API client, not here.
 *
 * @returns The query result: `data`, `isPending`, `isError`, `error` and `refetch`.
 */
export function useScenarios(): UseQueryResult<Scenario[], Error> {
  return useQuery({
    queryKey: scenarioKeys.list,
    queryFn: getScenarios,
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
  });
}

/** Everything the scenario list screen needs, loaded together. */
export type ScenarioLibrary = {
  scenarios: Scenario[];
  projects: Project[];
  mapsByProject: Record<string, ProjectMap[]>;
  /** True until scenarios, projects and the maps of every project in use have loaded. */
  isPending: boolean;
  /** True only when the scenarios themselves failed to load. */
  isError: boolean;
  error: Error | null;
  /** When the scenarios request last failed (a timestamp), or 0 if it has not failed. */
  errorUpdatedAt: number;
  refetch: () => Promise<unknown>;
};

/**
 * Loads scenarios plus the project and map names needed to group them.
 * Names are decoration: if projects or maps fail to load, the list still
 * works and shows ids instead. Only a scenarios failure counts as an error.
 *
 * @returns The scenarios, lookup data and loading/error state.
 */
export function useScenarioLibrary(): ScenarioLibrary {
  const scenarios = useScenarios();
  const projects = useProjects();

  const projectIds = [...new Set(scenarios.data?.map((scenario) => scenario.projectId) ?? [])];
  const mapQueries = useQueries({
    queries: projectIds.map((projectId) => ({
      queryKey: scenarioKeys.maps(projectId),
      queryFn: () => getProjectMaps(projectId),
    })),
  });

  const mapsByProject: Record<string, ProjectMap[]> = {};
  projectIds.forEach((projectId, index) => {
    mapsByProject[projectId] = mapQueries[index].data ?? [];
  });

  return {
    scenarios: scenarios.data ?? [],
    projects: projects.data ?? [],
    mapsByProject,
    isPending:
      scenarios.isPending || projects.isPending || mapQueries.some((query) => query.isPending),
    isError: scenarios.isError,
    error: scenarios.error,
    errorUpdatedAt: scenarios.errorUpdatedAt,
    refetch: scenarios.refetch,
  };
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

/**
 * Edits a draft scenario and refreshes the list and that scenario's detail when it succeeds.
 *
 * @param scenarioId - Id of the scenario to edit.
 * @returns The mutation result; call `mutate` with the new project, map and name.
 */
export function useUpdateScenario(
  scenarioId: string,
): UseMutationResult<Scenario, Error, CreateScenarioInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateScenarioInput) => updateScenario(scenarioId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: scenarioKeys.list }),
        queryClient.invalidateQueries({ queryKey: scenarioKeys.detail(scenarioId) }),
      ]);
    },
  });
}
