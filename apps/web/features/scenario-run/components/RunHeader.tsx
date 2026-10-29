import { ArrowLeft, Pause, Play, Square } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { clockLabel } from "@/features/scenario-config/timeline/geometry";
import { cn } from "@/lib/utils";

import { formatHM } from "../live/engine";
import type { RunPhase, RunSnapshot } from "../live/types";
import { runHeaderStyles as styles } from "./RunHeader.styles";

const PHASE_TEXT: Record<RunPhase, string> = {
  "warming-up": "Running",
  running: "Running",
  paused: "Paused",
  stopped: "Stopped",
  completed: "Finished",
};

type RunHeaderProps = {
  scenarioId: string;
  scenarioName: string;
  /** "Project · Map". */
  context: string;
  snapshot: RunSnapshot;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

/** Where the run is on its clock, as the header says it. */
function clockText(snapshot: RunSnapshot): string {
  switch (snapshot.phase) {
    case "warming-up":
      return "Warming up";
    case "completed":
      return `${formatHM(snapshot.runHours)} run`;
    case "stopped":
      return `Stopped at ${formatHM(snapshot.nowH)} of ${formatHM(snapshot.runHours)}`;
    default:
      return `${formatHM(snapshot.nowH)} of ${formatHM(snapshot.runHours)} · ${clockLabel(snapshot.clockH)} warehouse time`;
  }
}

/**
 * The top of the run screen: back to the config, the scenario, where the run is on its clock,
 * its state, the scenario config, and pause, resume and stop while it runs. Tools (Grafana,
 * Tower, MD) are not connected yet.
 */
export function RunHeader({
  scenarioId,
  scenarioName,
  context,
  snapshot,
  onPause,
  onResume,
  onStop,
}: RunHeaderProps): React.JSX.Element {
  const live = snapshot.phase !== "completed" && snapshot.phase !== "stopped";
  return (
    <header className={styles.root}>
      <Link
        href={`/scenarios/${encodeURIComponent(scenarioId)}/config`}
        className={styles.back}
        aria-label="Back to the scenario config"
      >
        <ArrowLeft className={styles.backIcon} aria-hidden="true" />
      </Link>
      <div className={styles.titles}>
        <h1 className={styles.name}>{scenarioName}</h1>
        <p className={styles.context}>
          {context} · <span className={styles.clock}>{clockText(snapshot)}</span>
        </p>
      </div>
      <div className={styles.actions}>
        <span className={cn(styles.phase, styles[snapshot.phase])} role="status">
          {PHASE_TEXT[snapshot.phase]}
        </span>
        <Link
          href={`/scenarios/${encodeURIComponent(scenarioId)}/config`}
          className={styles.secondary}
        >
          Scenario Config
        </Link>
        <button
          type="button"
          className={styles.secondary}
          disabled
          title="Grafana, Tower and MD links come later"
        >
          Tools
        </button>
        {live && (
          <>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={snapshot.phase === "paused" ? "Resume the run" : "Pause the run"}
              onClick={snapshot.phase === "paused" ? onResume : onPause}
            >
              {snapshot.phase === "paused" ? (
                <Play className={styles.icon} />
              ) : (
                <Pause className={styles.icon} />
              )}
            </button>
            <Button variant="danger" size="sm" className={styles.stop} onClick={onStop}>
              <Square className={styles.icon} aria-hidden="true" />
              Stop run
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
