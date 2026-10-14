"use client";

import { useState } from "react";

import { STATUS_LABELS } from "../constants";
import { countByStatus, filterByStatus, groupScenarios } from "../grouping";
import { useScenarioLibrary } from "../hooks";
import type { SortOption, StatusFilter } from "../types";
import { ScenarioGroups } from "./ScenarioGroups";
import { ScenarioListEmpty, ScenarioListError, ScenarioListLoading } from "./ScenarioListStates";
import { ScenarioToolbar } from "./ScenarioToolbar";

/**
 * Scenario list screen. Loads scenarios (`GET /scenarios`) and shows a loading
 * or error state, or the toolbar (status filter and sort) above the scenarios
 * grouped by project and map. Filter and sort live in component state.
 */
export function ScenarioList(): React.JSX.Element {
  const library = useScenarioLibrary();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortOption>("recent");

  if (library.isPending) return <ScenarioListLoading />;
  if (library.isError) {
    return (
      <ScenarioListError
        message={library.error?.message ?? "Something went wrong."}
        onRetry={() => void library.refetch()}
      />
    );
  }

  const counts = countByStatus(library.scenarios);
  const groups = groupScenarios(
    filterByStatus(library.scenarios, filter),
    library.projects,
    library.mapsByProject,
    sort,
  );

  return (
    <>
      <ScenarioToolbar
        filter={filter}
        counts={counts}
        sort={sort}
        onFilterChange={setFilter}
        onSortChange={setSort}
      />
      {groups.length === 0 ? (
        <ScenarioListEmpty statusLabel={filter === "all" ? undefined : STATUS_LABELS[filter].toLowerCase()} />
      ) : (
        <ScenarioGroups groups={groups} />
      )}
    </>
  );
}
