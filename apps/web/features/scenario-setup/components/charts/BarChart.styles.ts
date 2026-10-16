/** Class groups for the BarChart component. */
export const barChartStyles = {
  root: "relative rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  svg: "block h-auto w-full",
  baseline: "stroke-line-strong",
  axisLabel: "fill-faint font-mono text-[8px]",
  bar: "transition-opacity duration-100",
  tooltip:
    "pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] text-white/70 shadow-[0_4px_12px_rgba(0,0,0,.2)]",
  tooltipValue: "block text-xs font-semibold text-white",
  peak: "mt-1.5 text-[11px] text-faint",
  tableOnly: "sr-only",
  empty: "py-6 text-center text-[11px] text-faint",
} as const;
