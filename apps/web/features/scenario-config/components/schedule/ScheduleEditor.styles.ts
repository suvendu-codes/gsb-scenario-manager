/** Class groups for the ScheduleEditor component. */
export const scheduleEditorStyles = {
  root: "flex flex-col gap-3",
  footer: "flex items-center justify-between gap-3",
  total: "text-[12px] text-faint",
  copy: "flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent",
  copyIcon: "size-3.5",
  copyNote: "text-[11.5px] leading-snug text-faint",
  none: "flex flex-col gap-3 rounded-lg border border-line bg-paper px-3 py-3",
  noneText: "text-[12.5px] leading-snug text-muted",
  select: "h-9 rounded-lg px-3 text-[13px]",
  apply:
    "w-fit cursor-pointer rounded-md bg-accent px-3 py-1.5 text-[12px] font-semibold text-panel transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
} as const;
