/** Class groups for the Stepper component. */
export const stepperStyles = {
  root: "inline-flex flex-none items-center rounded-full border border-line-strong bg-panel p-0.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
  button:
    "flex size-7 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-paper-2 hover:text-ink disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-accent",
  icon: "size-3.5",
  valueWrap: "flex min-w-[52px] items-center justify-center gap-0.5 px-1",
  input:
    "w-full min-w-0 bg-transparent text-center text-[13px] font-medium tabular-nums text-ink outline-none disabled:text-faint",
  unit: "flex-none text-[11px] text-faint",
} as const;
