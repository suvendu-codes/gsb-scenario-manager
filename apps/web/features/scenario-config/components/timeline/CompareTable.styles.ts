/** Class groups for the CompareTable component. */
export const compareTableStyles = {
  scroll: "overflow-x-auto border-t border-line",
  table: "w-full border-collapse text-[12px]",
  head: "border-b border-line bg-paper px-2.5 py-2 text-left text-[11px] font-semibold whitespace-nowrap text-muted",
  first: "sticky left-0 z-[1] min-w-[180px] bg-inherit text-left",
  cell: "border-b border-line px-2.5 py-2 whitespace-nowrap text-ink",
  none: "text-faint",
  typeRow: "bg-[#f4f5f7]",
  stationRow: "bg-panel hover:bg-paper",
  rowHead: "flex items-center gap-1",
  chevron:
    "flex size-6 flex-none cursor-pointer items-center justify-center rounded-md text-faint hover:text-ink focus-visible:outline-2 focus-visible:outline-accent",
  icon: "size-4",
  name: "cursor-pointer rounded px-1 py-0.5 text-left font-semibold text-ink hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-accent",
  stationName: "ml-7",
  count: "text-[11.5px] font-medium text-faint",
  tag: "mr-1 inline-block rounded px-1.5 py-px text-[11px] font-semibold",
  tagPick: "bg-pick-bg text-pick-ink",
  tagPut: "bg-put-bg text-put-ink",
  tagAudit: "bg-audit-bg text-audit-ink",
  dot: "ml-1.5 inline-block size-[6px] rounded-full bg-accent align-middle",
} as const;
