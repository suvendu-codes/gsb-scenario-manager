/** Class groups for the StationsCard component. */
export const stationsCardStyles = {
  expandAll:
    "cursor-pointer text-[12.5px] font-semibold text-muted hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-accent",
  toolbar: "flex flex-wrap items-center justify-between gap-3 px-4 pt-2 pb-2",
  pills: "flex flex-wrap gap-1.5",
  pill: "flex cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-panel px-3 py-1 text-[12px] font-semibold text-muted transition-colors hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-panel focus-visible:outline-2 focus-visible:outline-accent",
  pillCount: "font-normal opacity-70",
  legend: "flex flex-wrap items-center justify-end gap-3 text-[11px] text-muted",
  legendItem: "inline-flex items-center gap-1.5",
  legendSwatch: "inline-block size-[11px] rounded-[3px] border",
  legendPick: "border-pick-line bg-pick-bg",
  legendPut: "border-put-line bg-put-bg",
  legendAudit: "border-audit-line bg-audit-bg",
  legendBreak: "border-[1.5px] border-break bg-panel",
  legendTea: "border-[1.5px] border-accent bg-panel",
  legendTotal: "font-mono",
  dot: "inline-block size-[7px] flex-none rounded-full bg-[#f79009]",
  allRow:
    "flex h-[52px] w-full cursor-pointer items-center justify-between border-t border-line px-4 text-left hover:bg-paper focus-visible:outline-2 focus-visible:outline-accent",
  allLabel: "text-[15px] font-semibold text-ink",
  count: "ml-2 text-[12.5px] font-medium text-faint",
  configure:
    "cursor-pointer rounded-md px-2 py-1 text-[12px] font-medium text-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent",
  rowSelected: "bg-accent-soft hover:bg-accent-soft",
  typeRow:
    "flex h-[50px] items-center gap-1 border-y border-line bg-[#f4f5f7] pr-4 pl-2 hover:bg-[#eef0f3]",
  chevron:
    "flex size-6 flex-none cursor-pointer items-center justify-center rounded-md text-faint hover:text-ink focus-visible:outline-2 focus-visible:outline-accent",
  chevronIcon: "size-4",
  typeLabel:
    "flex flex-1 cursor-pointer items-center gap-0 text-left text-[14px] font-semibold text-ink focus-visible:outline-2 focus-visible:outline-accent [&>i]:ml-2",
  stationRow: "border-b border-line hover:bg-paper [&>div]:border-t-0",
  stationLabel:
    "flex min-w-0 cursor-pointer items-center gap-2 rounded px-1 py-0.5 pl-8 text-[13px] font-semibold text-ink hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-accent",
  unassigned: "absolute inset-y-0 left-2 flex items-center text-[12px] text-faint italic",
  mark: "pointer-events-auto absolute top-3 z-[3] h-4 min-w-[5px] rounded-[3px] border-[1.5px] border-break bg-panel",
  markTea: "border-accent",
} as const;
