/** Class groups for the scenario list loading, empty and error states. */
export const scenarioListStatesStyles = {
  skeletonList: "flex flex-col gap-2",
  skeletonRow: "h-[66px] animate-pulse rounded-xl border border-line bg-paper-2",
  message: "mt-12 flex flex-col items-center gap-3 text-center",
  messageTitle: "text-[15px] font-bold text-ink",
  messageText: "text-[13.5px] text-muted",
} as const;
