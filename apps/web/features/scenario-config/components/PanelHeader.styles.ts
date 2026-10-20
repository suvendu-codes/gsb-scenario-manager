/** Class groups for the PanelHeader component. */
export const panelHeaderStyles = {
  root: "flex flex-col gap-1.5 border-b border-line px-5 py-4",
  row: "flex items-center gap-2",
  back: "flex size-6 flex-none cursor-pointer items-center justify-center rounded-md text-faint transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent",
  backIcon: "size-4",
  title: "min-w-0 flex-1 truncate text-[15px] font-semibold text-ink",
  badge: "flex-none rounded-full border px-2 py-0.5 text-[11px] font-medium",
  badgeDefault: "border-line-strong bg-paper text-muted",
  badgeCustomized: "border-accent-line bg-accent-soft text-accent",
  reset:
    "flex size-6 flex-none cursor-pointer items-center justify-center rounded-md text-faint transition-colors hover:bg-paper-2 hover:text-ink disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-accent",
  resetIcon: "size-3.5",
  description: "text-[12px] leading-snug text-faint",
} as const;
