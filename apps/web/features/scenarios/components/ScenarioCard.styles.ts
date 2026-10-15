/** Class groups for the ScenarioCard component. */
export const scenarioCardStyles = {
  root: "relative rounded-xl border border-line-strong bg-panel px-4 py-2.5 transition-colors hover:border-muted hover:shadow-[0_1px_6px_rgba(0,0,0,.05)]",
  // A draft is a link; its stretched ::after makes the whole card clickable.
  rootClickable: "cursor-pointer focus-within:outline-2 focus-within:outline-accent",
  top: "flex flex-wrap items-center gap-2.5",
  name: "text-[15px] font-semibold text-ink",
  nameLink:
    "underline-offset-[3px] after:absolute after:inset-0 after:rounded-xl hover:underline focus-visible:outline-none",
  meta: "mt-[3px] text-xs text-muted",
  separator: "mx-1.5 text-faint",
} as const;
