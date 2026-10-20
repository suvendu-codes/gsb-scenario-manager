/** Class groups for the CheckChips component. */
export const checkChipsStyles = {
  root: "grid grid-cols-2 gap-2",
  chip: "relative flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2.5 text-[13px] text-ink transition-colors hover:border-line-strong has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:disabled]:cursor-default has-[:disabled]:opacity-60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
  input: "peer sr-only",
  box: "flex size-4 flex-none items-center justify-center rounded-[4px] border-[1.5px] border-line-strong bg-panel text-transparent peer-checked:border-accent peer-checked:bg-accent peer-checked:text-panel",
  tick: "size-3",
} as const;
