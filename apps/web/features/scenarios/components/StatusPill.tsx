import { cn } from "@/lib/utils";

import type { ScenarioStatus } from "../types";
import { statusPillStyles } from "./StatusPill.styles";

const STATUS_LABELS: Record<ScenarioStatus, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
};

/**
 * Small coloured badge showing a scenario's status.
 *
 * @param status - The scenario status to display.
 */
export function StatusPill({ status }: { status: ScenarioStatus }): React.JSX.Element {
  return (
    <span className={cn(statusPillStyles.base, statusPillStyles.byStatus[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}
