/** Class groups for the SchedulerWeights component. */
export const schedulerWeightsStyles = {
  root: "flex flex-col gap-4",
  select: "h-9 rounded-lg px-3 text-[13px]",
  rows: "flex flex-col gap-4",
  row: "flex flex-col gap-2",
  rowHead: "flex items-center justify-between gap-4",
  rowText: "min-w-0",
  rowLabel: "block text-[13px] font-medium text-ink",
  rowNote: "block text-[11.5px] text-faint",
  share: "flex items-center gap-3",
  track: "h-1.5 flex-1 overflow-hidden rounded-full bg-track",
  fill: "block h-full rounded-full bg-accent transition-[width]",
  shareText: "w-[78px] flex-none text-right text-[11.5px] tabular-nums text-faint",
} as const;
