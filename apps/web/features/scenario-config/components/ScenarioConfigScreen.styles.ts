/** Class groups for the ScenarioConfigScreen component. */
export const scenarioConfigScreenStyles = {
  root: "flex h-full min-h-[560px] flex-col",
  skeleton: "mx-auto flex w-full max-w-[920px] flex-col gap-3 px-6 pt-10",
  skeletonLine: "h-[60px] animate-pulse rounded-xl border border-line bg-paper-2",
  alert: "border-b border-error-line bg-danger-soft px-6 py-2 text-[12.5px] text-danger-ink",
  alertRow:
    "flex items-center justify-between gap-4 border-b border-error-line bg-danger-soft px-6 py-2 text-[12.5px] text-danger-ink",
  body: "grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_440px]",
  timeline:
    "flex min-h-[160px] flex-col gap-2 rounded-xl border border-dashed border-line-strong bg-panel px-6 py-6",
  timelineTitle: "text-[15px] font-semibold text-ink",
  timelineText: "max-w-[520px] text-[12.5px] leading-snug text-faint",
} as const;
