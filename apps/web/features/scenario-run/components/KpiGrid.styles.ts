/** Class groups for the KpiGrid component. */
export const kpiGridStyles = {
  root: "flex flex-col gap-2",
  head: "flex items-baseline justify-between",
  title: "text-[14px] font-semibold text-ink",
  window: "text-[12.5px] text-muted",
  grid: "grid grid-cols-2 gap-2 xl:grid-cols-4",
  tile: "flex min-h-[100px] flex-col gap-1.5 rounded-xl border border-line bg-panel px-3 py-2.5",
  tileHead: "flex items-center justify-between gap-2",
  label:
    "text-[13px] text-ink underline decoration-dotted decoration-line-strong underline-offset-4",
  status: "rounded-full px-2 py-px text-[11px] font-semibold",
  ok: "bg-good-soft text-good",
  watch: "bg-warn-soft text-warn",
  waiting: "border border-line-strong bg-panel text-muted",
  done: "bg-good-soft text-good",
  valueRow: "flex items-baseline gap-1.5",
  value: "text-[20px] font-semibold text-ink tabular-nums",
  unit: "text-[13px] text-muted",
  detail: "text-[12px] text-faint",
  skeletonValue: "h-6 w-24 animate-pulse rounded-md bg-paper-2",
  skeletonDetail: "h-3 w-32 animate-pulse rounded bg-paper-2",
} as const;
