/** Class groups for the ValidationErrors component. */
export const validationErrorsStyles = {
  root: "mb-3.5 rounded-[10px] border border-error-line bg-panel px-[18px] py-3.5",
  intro: "mb-0.5 text-[11.5px] font-bold text-error-ink",
  note: "mb-2 mt-0.5 text-xs text-ink",
  list: "max-h-[280px] overflow-y-auto pr-1.5",
  item: "border-b border-line last:border-b-0",
  summary:
    "flex cursor-pointer list-none items-center gap-2 py-2.5 text-[12.5px] font-semibold text-error-ink focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden",
  summaryLabel: "flex-1",
  summaryCount: "text-[11px] font-normal text-error-muted",
  chevron: "size-2.5 text-faint transition-transform group-open:rotate-90",
  lines: "pb-3",
  line: "mt-1 border-l-2 border-danger py-1 pl-[9px] text-[11px] leading-snug text-error-ink",
} as const;
