/** Class groups for the TeaBreakEditor component. */
export const teaBreakEditorStyles = {
  root: "flex flex-col gap-3 rounded-lg bg-paper px-3 py-3",
  head: "flex items-center justify-between gap-3",
  title: "text-[12.5px] font-semibold text-ink",
  note: "flex-1 text-[11.5px] text-faint",
  remove:
    "cursor-pointer text-[11.5px] text-faint underline hover:text-ink focus-visible:outline-2 focus-visible:outline-accent",
  row: "flex items-center justify-between gap-3",
  rowLabel: "text-[12.5px] text-muted",
  patternHint: "text-[11.5px] leading-snug text-faint",
} as const;
