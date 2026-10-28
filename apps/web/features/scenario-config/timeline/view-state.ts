/**
 * What the Stations card of the timeline shows: which types (all, or one), which types are
 * expanded to their stations, and whether the compare table replaces the lanes. Kept in the
 * page, not in the config.
 */
export type TimelineView = {
  /** `all`, or the id of the one type shown. */
  filter: string;
  /** Ids of the expanded types. */
  expanded: string[];
  compare: boolean;
};

export const INITIAL_TIMELINE_VIEW: TimelineView = { filter: "all", expanded: [], compare: false };

/** Shows every type, or only one. */
export function setFilter(view: TimelineView, filter: string): TimelineView {
  return { ...view, filter };
}

/** Expands a type to its stations, or collapses it. */
export function toggleExpanded(view: TimelineView, typeId: string): TimelineView {
  const expanded = view.expanded.includes(typeId)
    ? view.expanded.filter((id) => id !== typeId)
    : [...view.expanded, typeId];
  return { ...view, expanded };
}

/** True when every one of these types is expanded. */
export function allExpanded(view: TimelineView, typeIds: readonly string[]): boolean {
  return typeIds.length > 0 && typeIds.every((id) => view.expanded.includes(id));
}

/** Expands every type, or collapses them all when they all are expanded already. */
export function toggleAll(view: TimelineView, typeIds: readonly string[]): TimelineView {
  return { ...view, expanded: allExpanded(view, typeIds) ? [] : [...typeIds] };
}

/** Switches between the lanes and the compare table. */
export function toggleCompare(view: TimelineView): TimelineView {
  return { ...view, compare: !view.compare };
}

/** The types shown under the filter. */
export function visibleTypes<T extends { id: string }>(types: readonly T[], filter: string): T[] {
  return filter === "all" ? [...types] : types.filter((type) => type.id === filter);
}
