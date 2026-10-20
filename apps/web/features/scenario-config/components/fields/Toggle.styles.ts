/** Class groups for the Toggle component. */
export const toggleStyles = {
  root: "relative inline-flex h-[22px] w-[38px] flex-none cursor-pointer items-center rounded-full bg-line-strong p-0.5 transition-colors aria-checked:bg-accent disabled:cursor-default disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  thumb:
    "size-[18px] rounded-full bg-panel shadow-sm transition-transform group-aria-checked:translate-x-4",
} as const;
