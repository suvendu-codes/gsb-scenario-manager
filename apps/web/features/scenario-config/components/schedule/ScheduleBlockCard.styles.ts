/** Class groups for the ScheduleBlockCard component. */
export const scheduleBlockCardStyles = {
  root: "flex flex-col gap-3 rounded-lg border border-line bg-panel px-3 py-3",
  head: "flex items-center gap-2",
  dot: "size-2 flex-none rounded-full",
  dotPick: "bg-[#5b5be0]",
  dotPut: "bg-[#d8479c]",
  dotAudit: "bg-[#c28a2d]",
  title: "text-[13px] font-semibold text-ink",
  range: "flex-1 text-[12px] text-faint",
  row: "flex items-center justify-between gap-3",
  rowLabel: "text-[12.5px] text-muted",
  select: "h-8 w-40 rounded-lg px-2.5 text-[12.5px]",
  breaks: "flex flex-col gap-2 border-t border-dashed border-line pt-3",
  breaksHead: "text-[12.5px] font-semibold text-ink",
  breaksCount: "ml-1 font-normal text-faint",
  addRow: "flex gap-3",
  add: "w-fit cursor-pointer text-[12px] font-medium text-accent hover:underline disabled:cursor-default disabled:text-faint disabled:no-underline focus-visible:outline-2 focus-visible:outline-accent",
  actions: "flex gap-2 border-t border-line pt-3",
  action:
    "flex-1 cursor-pointer rounded-md border border-line px-2 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-paper disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-accent",
  danger: "text-danger",
} as const;
