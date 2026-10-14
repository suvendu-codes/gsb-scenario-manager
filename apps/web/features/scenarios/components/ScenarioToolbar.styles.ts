/** Class groups for the ScenarioToolbar component. */
export const scenarioToolbarStyles = {
  root: "mb-2 flex flex-wrap items-center justify-between gap-3.5",
  chips: "flex flex-wrap gap-2",
  chip: "inline-flex cursor-pointer items-center gap-[7px] rounded-full border border-line-strong bg-panel px-3.5 py-[7px] text-[12.5px] font-medium text-ink transition-colors hover:border-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  chipSelected: "border-ink bg-ink text-white hover:border-ink",
  count: "text-[11px] font-semibold text-faint",
  countSelected: "text-white/65",
  sortLabel: "flex items-center gap-2 text-[12.5px] text-muted",
  sortSelect: "h-auto w-auto rounded-[10px] py-[7px] pl-3 pr-8 text-[13px] font-medium",
} as const;
