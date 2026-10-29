/** Class groups for the WmsCard component. */
export const wmsCardStyles = {
  cutoff:
    "pointer-events-none absolute inset-y-1 z-[3] -ml-px border-l-[1.5px] border-dashed border-ink before:absolute before:-left-[5px] before:top-0 before:size-2.5 before:rounded-[2px] before:bg-ink",
  cutoffLabel:
    "pointer-events-none absolute bottom-0.5 z-[3] whitespace-nowrap font-mono text-[10.5px] text-muted",
  cutoffEdge:
    "pointer-events-none absolute right-1.5 bottom-0.5 z-[3] whitespace-nowrap font-mono text-[10.5px] text-muted",
} as const;
