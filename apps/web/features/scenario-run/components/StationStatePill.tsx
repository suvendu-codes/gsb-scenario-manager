import { cn } from "@/lib/utils";

import { MODE_LABELS } from "@/features/scenario-config/components/schedule/schedule-text";

import type { StationLive, StationState } from "../live/types";
import { stationStatePillStyles as styles } from "./StationStatePill.styles";

export const STATE_LABELS: Record<StationState, string> = {
  starting: "Starting",
  working: "Working",
  "queue-full": "Queue full",
  "on-break": "On break",
  "off-shift": "Off shift",
  stopped: "Stopped",
};

/** A station's state with the mode it works in, as a small pill ("Working Pick"). */
export function StationStatePill({ station }: { station: StationLive }): React.JSX.Element {
  const showMode = station.mode && (station.state === "working" || station.state === "queue-full");
  return (
    <span className={cn(styles.root, styles[station.state])}>
      <i className={styles.dot} aria-hidden="true" />
      {STATE_LABELS[station.state]}
      {showMode && station.mode ? (
        <span className={styles.mode}>{MODE_LABELS[station.mode]}</span>
      ) : null}
    </span>
  );
}
