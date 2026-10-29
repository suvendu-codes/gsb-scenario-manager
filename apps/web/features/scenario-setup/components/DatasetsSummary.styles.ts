/** Class groups for the DatasetsSummary component. */
export const datasetsSummaryStyles = {
  root: "mb-3.5 rounded-[10px] border border-line bg-panel px-4",
  head: "flex w-full cursor-pointer items-center gap-2.5 py-[13px] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  label: "flex-1 text-[15px] font-medium text-ink",
  count: "ml-2 text-[11px] font-normal text-faint",
  bar: "flex items-center justify-end gap-2",
  // These are spans inside a button, so they need `block` for width and height to apply.
  barTrack: "block h-1.5 w-[120px] flex-none overflow-hidden rounded-[3px] bg-paper-2",
  barFill: "block h-full w-full rounded-[3px] bg-good",
  barLabel: "whitespace-nowrap text-[11px] font-semibold text-good",
  chevron: "size-2.5 text-faint transition-transform",
  chevronOpen: "rotate-90",
  body: "pb-4",
} as const;
