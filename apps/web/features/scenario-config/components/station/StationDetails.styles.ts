/** Class groups for the StationDetails component. */
export const stationDetailsStyles = {
  root: "px-5 py-5",
  summary:
    "cursor-pointer text-[14px] font-semibold text-ink focus-visible:outline-2 focus-visible:outline-accent",
  body: "mt-3 flex flex-col gap-3",
  note: "text-[12px] leading-snug text-faint",
  list: "flex flex-col gap-2",
  row: "flex items-baseline justify-between gap-4 text-[12.5px]",
  term: "text-muted",
  value: "text-right font-medium text-ink break-all",
} as const;
