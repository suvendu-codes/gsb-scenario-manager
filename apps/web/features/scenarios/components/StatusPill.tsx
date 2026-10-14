import { cn } from "@/lib/utils";

import { STATUS_LABELS } from "../constants";
import type { ScenarioStatus } from "../types";
import { statusPillStyles } from "./StatusPill.styles";

/**
 * Small coloured badge showing a scenario's status.
 * An active scenario also shows a pulsing dot.
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
