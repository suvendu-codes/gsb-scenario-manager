/** Class groups for the RunLoading component. */
export const runLoadingStyles = {
  root: "fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-panel",
  title: "text-[15px] font-semibold text-ink",
  detail: "-mt-2 text-[13px] text-faint",
  track: "h-1.5 w-64 overflow-hidden rounded-full bg-track",
  bar: "h-full rounded-full bg-accent transition-[width] duration-300",
  step: "text-[13px] text-muted",
} as const;
