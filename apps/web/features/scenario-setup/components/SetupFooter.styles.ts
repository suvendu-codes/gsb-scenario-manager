/** Class groups for the SetupFooter component. */
export const setupFooterStyles = {
  root: "mb-3.5 flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-line bg-panel px-[18px] py-3.5",
  progress: "mb-[5px] flex gap-[5px]",
  dot: "h-1 w-[26px] rounded-[2px] bg-track",
  dotOn: "bg-good",
  dotError: "bg-danger",
  note: "text-[11px] text-faint",
  hint: "text-right text-[11.5px] leading-snug text-faint",
  validateButton: "rounded-[7px] px-4 py-[7px] text-[12.5px]",
  bar: "flex items-center justify-end gap-2",
  barTrack: "h-1.5 w-[120px] flex-none overflow-hidden rounded-[3px] bg-paper-2",
  barFill: "h-full w-full origin-left rounded-[3px]",
  barFillRunning: "animate-[val-fill_.6s_ease-out_forwards] bg-accent",
  barFillFailed: "bg-danger",
  barLabel: "whitespace-nowrap text-[11px] font-semibold",
  barLabelRunning: "text-faint",
  barLabelFailed: "text-danger",
} as const;
