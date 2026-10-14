import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { SORT_OPTIONS, STATUS_FILTERS } from "../constants";
import type { SortOption, StatusFilter } from "../types";
import { scenarioToolbarStyles as styles } from "./ScenarioToolbar.styles";

type ScenarioToolbarProps = {
  filter: StatusFilter;
  counts: Record<StatusFilter, number>;
  sort: SortOption;
  onFilterChange: (filter: StatusFilter) => void;
  onSortChange: (sort: SortOption) => void;
};

/**
 * Controls above the list: status filter chips (each with a count) and a
 * "Sort by" dropdown.
 *
 * @param filter - The selected status filter.
 * @param counts - Number of scenarios per filter, shown on each chip.
 * @param sort - The selected sort option.
 * @param onFilterChange - Called when a chip is clicked.
 * @param onSortChange - Called when the sort option changes.
 */
export function ScenarioToolbar({
  filter,
  counts,
  sort,
  onFilterChange,
  onSortChange,
}: ScenarioToolbarProps): React.JSX.Element {
  return (
    <div className={styles.root}>
      <div className={styles.chips} role="group" aria-label="Filter scenarios by status">
        {STATUS_FILTERS.map((option) => {
          const isSelected = filter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              className={cn(styles.chip, isSelected && styles.chipSelected)}
              onClick={() => onFilterChange(option.value)}
            >
              {option.label}
              <span className={cn(styles.count, isSelected && styles.countSelected)}>
                {counts[option.value]}
              </span>
            </button>
          );
        })}
      </div>

      <label className={styles.sortLabel}>
        Sort by
        <Select
          className={styles.sortSelect}
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortOption)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
