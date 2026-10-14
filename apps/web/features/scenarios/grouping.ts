import type {
  MapGroup,
  Project,
  ProjectGroup,
  ProjectMap,
  Scenario,
  SortOption,
  StatusFilter,
} from "./types";

/**
 * Counts scenarios per status for the filter chips.
 *
 * @param scenarios - All scenarios, before any filter is applied.
 * @returns A count for `all` and for each status.
 */
export function countByStatus(scenarios: Scenario[]): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = { all: scenarios.length, draft: 0, active: 0, completed: 0 };
  for (const scenario of scenarios) counts[scenario.status] += 1;
  return counts;
}

/**
 * Keeps only the scenarios with the given status.
 *
 * @param scenarios - Scenarios to filter.
 * @param filter - A status, or `all` to keep everything.
 */
export function filterByStatus(scenarios: Scenario[], filter: StatusFilter): Scenario[] {
  return filter === "all" ? scenarios : scenarios.filter((scenario) => scenario.status === filter);
}

/**
 * Returns a sorted copy: by last update (newest or oldest first), or by name A–Z.
 *
 * @param scenarios - Scenarios to sort.
 * @param sort - The sort option.
 */
export function sortScenarios(scenarios: Scenario[], sort: SortOption): Scenario[] {
  const copy = [...scenarios];
  if (sort === "name") return copy.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "oldest") return copy.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  return copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Orders two groups by name for the `name` sort, otherwise by their date key. */
function compareGroups(sort: SortOption, a: { name: string; key: string }, b: { name: string; key: string }): number {
  if (sort === "name" || a.key === b.key) return a.name.localeCompare(b.name);
  return sort === "oldest" ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key);
}

/** The date a group is ordered by: its oldest scenario for `oldest`, otherwise its newest. */
function groupKey(keys: string[], sort: SortOption): string {
  const sorted = [...keys].sort();
  return sort === "oldest" ? sorted[0] : sorted[sorted.length - 1];
}

/**
 * Groups scenarios by project, then by map, ready to render.
 * Groups with no scenarios are dropped. A project or map that is missing from
 * the lookup lists falls back to showing its id as the name.
 *
 * Order: groups are ordered by their newest scenario (oldest scenario for the
 * `oldest` sort), or by name for the `name` sort; scenarios inside a map follow `sort`.
 *
 * @param scenarios - The scenarios to show (already filtered by status).
 * @param projects - Known projects, used for names and descriptions.
 * @param mapsByProject - Known maps per project id, used for map names.
 * @param sort - The sort option.
 * @returns Project groups, each with its map groups.
 */
export function groupScenarios(
  scenarios: Scenario[],
  projects: Project[],
  mapsByProject: Record<string, ProjectMap[]>,
  sort: SortOption,
): ProjectGroup[] {
  const projectIds = [...new Set([...projects.map((p) => p.id), ...scenarios.map((s) => s.projectId)])];

  const groups: ProjectGroup[] = [];
  for (const projectId of projectIds) {
    const inProject = scenarios.filter((s) => s.projectId === projectId);
    if (inProject.length === 0) continue;

    const knownMaps = mapsByProject[projectId] ?? [];
    const mapIds = [...new Set([...knownMaps.map((m) => m.id), ...inProject.map((s) => s.mapId)])];

    const maps: MapGroup[] = mapIds
      .map((mapId) => ({
        map: knownMaps.find((m) => m.id === mapId) ?? { id: mapId, name: mapId },
        scenarios: sortScenarios(
          inProject.filter((s) => s.mapId === mapId),
          sort,
        ),
      }))
      .filter((group) => group.scenarios.length > 0);

    maps.sort((a, b) =>
      compareGroups(sort, { name: a.map.name, key: a.scenarios[0].updatedAt }, { name: b.map.name, key: b.scenarios[0].updatedAt }),
    );

    groups.push({
      project: projects.find((p) => p.id === projectId) ?? { id: projectId, name: projectId, description: "" },
      maps,
      total: inProject.length,
    });
  }

  const keyOf = (group: ProjectGroup): string =>
    groupKey(
      group.maps.map((m) => m.scenarios[0].updatedAt),
      sort,
    );
  return groups.sort((a, b) =>
    compareGroups(sort, { name: a.project.name, key: keyOf(a) }, { name: b.project.name, key: keyOf(b) }),
  );
}
