/** Class groups for the StationTypeList component. */
export const stationTypeListStyles = {
  root: "flex flex-col gap-2 border-t border-line px-5 py-4",
  title: "text-[13px] font-semibold text-ink",
  description: "text-[12px] leading-snug text-faint",
  list: "flex flex-col",
  row: "flex items-center gap-2 border-b border-line py-2.5 last:border-b-0",
  label: "min-w-0 truncate text-[13px] font-medium text-ink",
  count: "flex-1 text-[12px] text-faint",
  dot: "size-1.5 flex-none rounded-full bg-accent",
  open: "inline-flex flex-none cursor-pointer items-center gap-0.5 rounded-md px-2 py-1 text-[12px] font-medium text-accent transition-colors hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent",
  openIcon: "size-3.5",
} as const;
