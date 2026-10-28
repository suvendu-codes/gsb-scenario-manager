/** Class groups for the TimelineLane and TimelineRuler components. */
export const timelineLaneStyles = {
  root: "grid grid-cols-[150px_minmax(0,1fr)] border-t border-line first:border-t-0",
  label: "flex min-w-0 items-center gap-2 px-4 text-[12.5px] font-semibold text-ink",
  track: "relative mr-4",
  gridLine: "absolute inset-y-0 border-l border-dashed border-line-strong opacity-80",
  axis: "relative mr-4 h-8",
  dot: "absolute bottom-1.5 -ml-px size-0.5 rounded-full bg-[#a4a7ae]",
  hour: "absolute top-1.5 -translate-x-1/2 font-mono text-[11px] text-muted",
} as const;
