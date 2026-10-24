/** Class groups for the SchedulePeriod component. */
export const schedulePeriodStyles = {
  root: "flex flex-col gap-3 rounded-lg border border-line bg-panel px-3 py-3",
  head: "flex items-center gap-2",
  dot: "size-2 flex-none rounded-full",
  dotPick: "bg-[#5b5be0]",
  dotPut: "bg-[#d8479c]",
  dotAudit: "bg-[#c28a2d]",
  dotOff: "bg-faint",
  title: "text-[13px] font-semibold text-ink",
  range: "flex-1 text-[12px] text-faint",
  action:
    "flex size-6 flex-none cursor-pointer items-center justify-center rounded-md text-faint transition-colors hover:bg-paper-2 hover:text-ink disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-accent",
  actionIcon: "size-3.5",
  row: "flex items-center justify-between gap-3",
  rowLabel: "text-[12.5px] text-muted",
  tea: "flex flex-col gap-2",
  addTea:
    "w-fit cursor-pointer text-[12px] font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent",
} as const;
