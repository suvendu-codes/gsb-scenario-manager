/** Class groups for the AttentionBar component. */
export const attentionBarStyles = {
  root: "flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3",
  warn: "border-warn-line bg-warn-soft",
  icon: "size-4 flex-none text-faint",
  text: "flex-1 text-[13.5px] font-semibold text-ink",
  log: "cursor-pointer rounded-full border border-line-strong bg-panel px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:bg-paper focus-visible:outline-2 focus-visible:outline-accent",
} as const;
