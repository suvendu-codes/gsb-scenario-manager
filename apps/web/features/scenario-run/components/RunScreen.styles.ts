/** Class groups for the RunScreen component. */
export const runScreenStyles = {
  root: "flex min-h-full flex-col",
  body: "grid flex-1 items-start gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px]",
  bodyEnded: "lg:grid-cols-1",
  main: "flex min-w-0 flex-col gap-4",
  complete: "flex items-start justify-between gap-3",
  completeTitle: "text-[17px] font-semibold text-ink",
  completeDetail: "text-[13px] text-muted",
  secondary:
    "cursor-pointer rounded-full border border-line-strong bg-panel px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:bg-paper focus-visible:outline-2 focus-visible:outline-accent",
  tabs: "flex w-fit overflow-hidden rounded-full border border-line-strong bg-panel",
  tab: "cursor-pointer px-4 py-1.5 text-[13px] font-semibold text-muted hover:text-ink aria-selected:bg-accent-soft aria-selected:text-accent focus-visible:outline-2 focus-visible:outline-accent [&+&]:border-l [&+&]:border-line-strong",
  dialogActions: "flex justify-end gap-2",
  loading: "m-4 h-40 animate-pulse rounded-xl border border-line bg-paper-2",
} as const;
