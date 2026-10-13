import type { ScenarioStatus } from "../types";

/** Class groups for the StatusPill component. */
export const statusPillStyles = {
  base: "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-normal",
  byStatus: {
    draft: "border-line-strong bg-paper-2 text-muted",
    active: "border-info-line bg-info-soft text-info",
    completed: "border-good-line bg-good-soft text-good",
  } satisfies Record<ScenarioStatus, string>,
} as const;
