/** Class groups for the StationsTable component. */
export const stationsTableStyles = {
  root: "overflow-hidden rounded-xl border border-line bg-panel",
  head: "px-4 pt-3 pb-2",
  title: "text-[14px] font-semibold text-ink",
  subtitle: "text-[12.5px] text-muted",
  table: "w-full border-collapse text-[13px]",
  th: "border-y border-line bg-paper px-4 py-2 text-left text-[12px] font-medium text-muted",
  num: "text-right tabular-nums",
  row: "border-b border-line last:border-b-0",
  rowWarn: "bg-warn-soft",
  name: "px-4 py-2.5 text-left font-semibold text-ink",
  td: "px-4 py-2.5 text-ink",
} as const;
