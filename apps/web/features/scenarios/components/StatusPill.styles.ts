import type { ScenarioStatus } from "../types";

/** Class groups for the StatusPill component. */
export const statusPillStyles = {
  base: "inline-flex items-center gap-[5px] rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-normal",
  byStatus: {
    draft: "border-line-strong bg-paper-2 text-muted",
    // The pulsing dot shows the scenario is live; it stays still for reduced-motion users.
    active:
      "border-info-line bg-info-soft text-info before:size-1.5 before:animate-pulse before:rounded-full before:bg-info-dot before:content-[''] motion-reduce:before:animate-none",
    completed: "border-good-line bg-good-soft text-good",
  } satisfies Record<ScenarioStatus, string>,
} as const;
