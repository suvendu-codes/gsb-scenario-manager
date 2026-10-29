/** Class groups for the SegmentedControl component. */
export const segmentedControlStyles = {
  root: "inline-flex rounded-lg bg-paper-2 p-0.5",
  segment:
    "relative cursor-pointer rounded-md px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-ink has-[:checked]:bg-panel has-[:checked]:text-ink has-[:checked]:shadow-sm has-[:disabled]:cursor-default has-[:disabled]:opacity-60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
  input: "sr-only",
} as const;
