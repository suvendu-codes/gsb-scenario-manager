/** Class groups for the SetupBreadcrumb component. */
export const setupBreadcrumbStyles = {
  root: "mb-4 flex items-center gap-2.5 overflow-hidden rounded-xl border-[1.5px] border-line bg-paper-2 px-5 py-4",
  check: "flex size-[22px] flex-none items-center justify-center rounded-full bg-good text-white",
  checkIcon: "size-3",
  summary: "flex-1 text-[12.5px] font-semibold",
  separator: "font-normal text-faint",
  edit: "cursor-pointer whitespace-nowrap text-[11px] font-semibold text-accent underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
} as const;
