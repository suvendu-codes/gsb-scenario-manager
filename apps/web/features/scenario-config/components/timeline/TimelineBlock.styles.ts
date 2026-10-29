/** Class groups for the TimelineBlock component. */
export const timelineBlockStyles = {
  root: "absolute top-1.5 bottom-1.5 z-[2] flex items-center overflow-hidden whitespace-nowrap rounded-[5px] border px-2.5 text-[12.5px]",
  button:
    "cursor-pointer text-left hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
  compact: "justify-center px-0.5 text-[11px]",
  label: "overflow-hidden text-ellipsis font-semibold",
  detail: "ml-auto pl-2 font-mono text-[11px] opacity-75",
  wave: "border-wave-line bg-wave-bg text-wave-ink",
  available: "border-avail-line bg-avail-bg text-avail-ink",
  outage: "border-outage-line bg-outage-bg text-outage-ink",
  pick: "border-pick-line bg-pick-bg text-pick-ink",
  put: "border-put-line bg-put-bg text-put-ink",
  audit: "border-audit-line bg-audit-bg text-audit-ink",
  mixed:
    "border-dashed border-line-strong bg-[repeating-linear-gradient(45deg,#fff_0_3px,var(--color-paper-2)_3px_6px)] text-muted",
} as const;
