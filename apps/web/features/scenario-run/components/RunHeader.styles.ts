/** Class groups for the RunHeader component. */
export const runHeaderStyles = {
  root: "flex items-center gap-3 border-b border-line bg-panel px-4 py-2.5",
  back: "flex size-8 flex-none items-center justify-center rounded-md text-muted hover:bg-paper-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent",
  backIcon: "size-4",
  titles: "min-w-0 flex-1",
  name: "truncate text-[15px] font-semibold text-ink",
  context: "truncate text-[12.5px] text-faint",
  clock: "text-muted",
  actions: "flex flex-none items-center gap-2",
  phase: "rounded-full border px-2.5 py-0.5 text-[12px] font-semibold",
  "warming-up": "border-good-line bg-good-soft text-good",
  running: "border-good-line bg-good-soft text-good",
  paused: "border-warn-line bg-warn-soft text-warn",
  stopped: "border-error-line bg-danger-soft text-danger-ink",
  completed: "border-line-strong bg-paper text-muted",
  secondary:
    "cursor-pointer rounded-full border border-line-strong bg-panel px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:bg-paper disabled:cursor-default disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent",
  iconButton:
    "flex size-8 cursor-pointer items-center justify-center rounded-full border border-line-strong bg-panel text-ink hover:bg-paper focus-visible:outline-2 focus-visible:outline-accent",
  icon: "size-3.5",
  stop: "gap-1.5 rounded-full",
} as const;
