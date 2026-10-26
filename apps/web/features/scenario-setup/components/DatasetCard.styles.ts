/** Class groups for the DatasetCard component. */
export const datasetCardStyles = {
  root: "flex min-h-[132px] flex-col gap-[9px] rounded-[10px] border-[1.5px] border-line bg-panel px-4 py-3.5 transition-colors",
  rootHas: "border-good",
  rootError: "border-danger",
  head: "flex items-center gap-[7px]",
  dot: "size-[7px] flex-none rounded-[2px] bg-faint",
  dotHas: "bg-good",
  dotError: "bg-danger",
  label: "flex-1 text-[13px] font-semibold",
  optionalTag: "text-[11px] font-semibold uppercase tracking-[.04em] text-faint",
  description: "-mt-1 text-[11px] text-faint",
  choiceRow: "flex items-center gap-2",
  selectWrap: "min-w-0 flex-1",
  select:
    "h-auto rounded-md bg-paper py-[7px] pl-[9px] pr-7 text-[11.5px] font-medium disabled:opacity-60",
  selectError: "text-error-ink",
  upload:
    "relative inline-flex flex-none cursor-pointer items-center justify-center gap-[5px] overflow-hidden rounded-md border-[1.5px] border-dashed border-accent-line bg-transparent px-3 py-[7px] text-[11px] font-semibold text-accent transition-colors hover:border-accent focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
  uploadBusy: "pointer-events-none opacity-60",
  uploadIcon: "size-3",
  fileInput: "absolute inset-0 size-full cursor-pointer opacity-0",
  templateRow: "mt-auto pt-0.5",
  templateLink:
    "cursor-pointer text-[11px] text-faint underline hover:text-muted focus-visible:outline-2 focus-visible:outline-accent",
  error: "text-[11.5px] text-danger-ink",
} as const;
