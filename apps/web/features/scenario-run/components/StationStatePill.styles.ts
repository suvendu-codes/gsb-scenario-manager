/** Class groups for the StationStatePill component. */
export const stationStatePillStyles = {
  root: "inline-flex items-center gap-1 rounded-full px-2 py-px text-[12px] font-medium whitespace-nowrap",
  dot: "size-1.5 rounded-full bg-current",
  mode: "font-normal opacity-75",
  starting: "bg-info-soft text-info",
  working: "bg-good-soft text-good",
  "queue-full": "bg-warn-soft text-warn",
  "on-break": "bg-paper-2 text-muted",
  "off-shift": "border border-line-strong text-muted",
  stopped: "bg-danger-soft text-danger-ink",
} as const;
