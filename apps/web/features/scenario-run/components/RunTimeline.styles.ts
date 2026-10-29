/** Class groups for the RunTimeline component. */
export const runTimelineStyles = {
  root: "overflow-hidden rounded-xl border border-line bg-panel pb-2",
  head: "px-4 pt-3",
  title: "text-[14px] font-semibold text-ink",
  subtitle: "text-[12.5px] text-muted",
  stationName:
    "flex cursor-pointer items-center gap-2 rounded px-1 text-left focus-visible:outline-2 focus-visible:outline-accent",
  stationLabel: "block text-[13px] font-semibold text-ink",
  stationState: "block text-[11.5px] font-normal text-faint",
  dot: "size-2 flex-none rounded-full",
  dotOn: "bg-[#6a6ff0]",
  dotOff: "bg-faint",
  rowLabel: "text-[12.5px] font-normal text-muted",
  offShift:
    "absolute inset-y-1.5 inset-x-0 rounded-[5px] border border-line bg-[repeating-linear-gradient(135deg,transparent_0_5px,var(--color-paper-2)_5px_7px)]",
  block:
    "absolute top-1.5 bottom-1.5 z-[2] flex items-center overflow-hidden rounded-[5px] border px-2 text-[12px] whitespace-nowrap",
  pick: "border-pick-line bg-pick-bg text-pick-ink",
  put: "border-put-line bg-put-bg text-put-ink",
  audit: "border-audit-line bg-audit-bg text-audit-ink",
  pickDone: "border-transparent bg-[#7b83f7]",
  putDone: "border-transparent bg-[#f064b4]",
  auditDone: "border-transparent bg-[#e0a24a]",
  mark: "absolute top-3.5 z-[3] h-4 min-w-[5px] rounded-[3px] border-[1.5px] border-break bg-panel",
  markTea: "border-accent",
  now: "pointer-events-none absolute -top-px -bottom-px z-[4] w-px bg-[#e5372a]",
  incident:
    "absolute top-2.5 z-[2] h-4 min-w-[8px] rounded-[3px] border border-outage-line bg-outage-bg",
  incidentPast: "border-[#d93a2b] bg-[#e5574a]",
  change: "absolute top-2.5 z-[3] h-4 w-1.5 -ml-[3px] rounded-[2px] bg-accent",
  none: "absolute inset-y-0 left-1 flex items-center text-[12px] text-faint",
} as const;
