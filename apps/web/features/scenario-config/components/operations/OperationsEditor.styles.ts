/** Class groups for the OperationsEditor component. */
export const operationsEditorStyles = {
  root: "flex flex-col gap-4",
  note: "text-[12px] leading-snug text-faint",
  tabs: "inline-flex w-fit rounded-lg bg-paper-2 p-0.5",
  tab: "cursor-pointer rounded-md px-4 py-1.5 text-[12.5px] font-medium text-muted transition-colors hover:text-ink aria-selected:bg-panel aria-selected:text-ink aria-selected:shadow-sm focus-visible:outline-2 focus-visible:outline-accent",
  panel: "flex flex-col gap-4",
  audit: "flex flex-col gap-5",
} as const;
