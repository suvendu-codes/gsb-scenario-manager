import type { ScenarioStatus, SortOption, StatusFilter } from "./types";

/** Display name of each scenario status. */
export const STATUS_LABELS: Record<ScenarioStatus, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
};

/** Status filter chips, in display order. */
export const STATUS_FILTERS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "draft", label: "Drafts" },
  { value: "active", label: "Active" },
];

/** Options of the "Sort by" dropdown, in display order. */
export const SORT_OPTIONS: ReadonlyArray<{ value: SortOption; label: string }> = [
  { value: "recent", label: "Last updated" },
  { value: "name", label: "Name (A–Z)" },
  { value: "oldest", label: "Oldest first" },
];
