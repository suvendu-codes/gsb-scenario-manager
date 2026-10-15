"use client";

import { useState } from "react";

import { isServiceFailure } from "@/lib/api/errors";
import { useHealthCheck } from "@/lib/api/use-health-check";

import { STATUS_LABELS } from "../constants";
import { countByStatus, filterByStatus, groupScenarios } from "../grouping";
import { useScenarioLibrary } from "../hooks";
import type { SortOption, StatusFilter } from "../types";
import { ScenarioGroups } from "./ScenarioGroups";
import {
  ScenarioListEmpty,
  ScenarioListError,
  ScenarioListLoading,
  ScenarioListServiceDown,
} from "./ScenarioListStates";
import { ScenarioToolbar } from "./ScenarioToolbar";

/**
 * Scenario list screen. Loads scenarios (`GET /scenarios`) and shows a loading
 * state, an error state, or the toolbar (status filter and sort) above the
 * scenarios grouped by project and map. Filter and sort live in component state.
 *
 * When the load fails in a way that could mean an outage (network error, timeout
 * or 5xx), it checks `/health` and shows "Service unavailable" if that fails too.
 */
export function ScenarioList(): React.JSX.Element {
  const library = useScenarioLibrary();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortOption>("recent");

  const mayBeDown = library.isError && isServiceFailure(library.error);
  const health = useHealthCheck(mayBeDown, library.errorUpdatedAt);

  if (library.isPending) return <ScenarioListLoading />;
  if (library.isError) {
    if (health.isChecking) return <ScenarioListLoading />;
    if (health.isDown) return <ScenarioListServiceDown onRetry={() => void library.refetch()} />;
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
        <ScenarioListEmpty
          statusLabel={filter === "all" ? undefined : STATUS_LABELS[filter].toLowerCase()}
        />
      ) : (
        <ScenarioGroups groups={groups} />
      )}
    </>
  );
}
