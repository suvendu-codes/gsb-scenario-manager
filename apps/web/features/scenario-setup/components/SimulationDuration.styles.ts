/** Class groups for the SimulationDuration component. */
export const simulationDurationStyles = {
  root: "mt-4 flex items-center justify-between gap-2.5 rounded-[10px] border border-line bg-panel px-[18px] py-4",
  title: "text-[13px] font-semibold",
  sub: "block text-[11px] font-normal text-faint",
  stepper: "flex flex-none items-center gap-[5px]",
  button:
    "flex size-6 cursor-pointer items-center justify-center rounded-[5px] border border-line-strong bg-panel text-ink disabled:cursor-default disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-accent",
  icon: "size-3",
  value: "min-w-[42px] text-center font-mono text-xs font-semibold",
} as const;
