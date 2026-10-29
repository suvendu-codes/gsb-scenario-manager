/** Class groups for the TimelineCard component. */
export const timelineCardStyles = {
  root: "shrink-0 overflow-hidden rounded-xl border border-line bg-panel pb-2 transition-shadow",
  selected: "border-accent-line shadow-[0_0_0_2px_var(--color-accent-soft)]",
  head: "flex items-start justify-between gap-3 px-4 pt-3",
  titleButton:
    "flex cursor-pointer flex-col items-start rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  title: "flex items-center gap-1 text-[15px] font-bold leading-tight text-ink",
  chevron: "size-3.5 text-faint",
  subtitle: "mt-0.5 text-[11.5px] text-faint",
} as const;
