/** Class groups for the ConfigHeader component. */
export const configHeaderStyles = {
  root: "flex items-center gap-4 border-b border-line bg-panel px-6 py-3",
  back: "flex size-8 flex-none items-center justify-center rounded-lg text-muted transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent",
  backIcon: "size-4",
  titles: "min-w-0 flex-1",
  crumb: "truncate text-[11.5px] text-faint",
  nameRow: "flex items-center gap-2",
  name: "truncate text-[15px] font-semibold text-ink",
  actions: "flex flex-none items-center gap-3",
  save: "text-[12px] text-faint",
  saveError: "text-danger-ink",
  history: "flex items-center gap-1",
  historyButton:
    "flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-paper-2 hover:text-ink disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-accent",
  historyIcon: "size-4",
  run: "rounded-lg px-4 py-2 text-[13px]",
} as const;
