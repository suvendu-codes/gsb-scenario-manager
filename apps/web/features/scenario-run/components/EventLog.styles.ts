/** Class groups for the EventLog component. */
export const eventLogStyles = {
  overlay: "fixed inset-0 z-40 bg-ink/30 backdrop-blur-[1px]",
  drawer:
    "fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col gap-3 bg-panel px-4 py-4 shadow-xl focus:outline-none",
  head: "flex items-start justify-between gap-3",
  title: "text-[17px] font-semibold text-ink",
  subtitle: "text-[12.5px] text-muted",
  close:
    "flex size-7 cursor-pointer items-center justify-center rounded-md text-faint hover:bg-paper-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent",
  search: "h-9 rounded-lg text-[13px]",
  filters: "grid grid-cols-2 gap-2",
  select: "h-9 rounded-lg px-3 text-[13px]",
  list: "-mx-4 min-h-0 flex-1 overflow-y-auto",
  item: "flex gap-4 border-b border-line px-4 py-2.5",
  time: "w-14 flex-none pt-0.5 font-mono text-[11.5px] text-muted",
  body: "flex min-w-0 flex-col",
  eventTitle: "text-[13.5px] text-ink",
  warning: "font-semibold text-warn",
  source: "text-[11.5px] text-faint",
  empty: "px-4 py-3 text-[12.5px] text-faint",
} as const;
