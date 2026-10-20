/** Class groups for the OverrideNotice component. */
export const overrideNoticeStyles = {
  root: "flex flex-col gap-2 rounded-lg border border-info-line bg-info-soft px-3 py-2.5",
  text: "text-[12px] leading-snug text-info",
  actions: "flex flex-wrap gap-2",
  action:
    "cursor-pointer rounded-md border border-info-line bg-panel px-2.5 py-1 text-[11.5px] font-medium text-info transition-colors hover:bg-info-soft disabled:cursor-default disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent",
} as const;
