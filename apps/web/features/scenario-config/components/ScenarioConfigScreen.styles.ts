/** Class groups for the ScenarioConfigScreen component. */
export const scenarioConfigScreenStyles = {
  root: "flex h-full min-h-[560px] flex-col",
  skeleton: "mx-auto flex w-full max-w-[920px] flex-col gap-3 px-6 pt-10",
  skeletonLine: "h-[60px] animate-pulse rounded-xl border border-line bg-paper-2",
  alert: "border-b border-error-line bg-danger-soft px-6 py-2 text-[12.5px] text-danger-ink",
  alertRow:
    "flex items-center justify-between gap-4 border-b border-error-line bg-danger-soft px-6 py-2 text-[12.5px] text-danger-ink",
  body: "grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_440px]",
  timelineLoading: "min-h-[160px] animate-pulse rounded-xl border border-line bg-paper-2",
  timelineError:
    "rounded-xl border border-error-line bg-danger-soft px-4 py-3 text-[12.5px] text-danger-ink",
} as const;
