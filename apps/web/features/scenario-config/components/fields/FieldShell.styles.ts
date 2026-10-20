/** Class groups for the FieldShell component. */
export const fieldShellStyles = {
  root: "flex flex-col gap-2",
  rootInline: "flex-row items-center justify-between gap-4",
  text: "min-w-0 flex-1",
  labelRow: "flex items-center gap-1.5",
  label: "text-[13px] font-medium text-ink",
  changedDot: "size-1.5 flex-none rounded-full bg-accent",
  reset:
    "flex size-5 flex-none cursor-pointer items-center justify-center rounded text-faint transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-accent",
  resetIcon: "size-3",
  hint: "mt-0.5 block text-[11.5px] leading-snug text-faint",
  control: "flex-none",
  controlStacked: "w-full",
} as const;
