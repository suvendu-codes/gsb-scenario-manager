import { cn } from "@/lib/utils";

import { MODE_LABELS } from "@/features/scenario-config/components/schedule/schedule-text";
import {
  TimelineLane,
  TimelineRuler,
} from "@/features/scenario-config/components/timeline/TimelineLane";
import { hourToPct } from "@/features/scenario-config/timeline/geometry";
import { breakMarks, laneSegments } from "@/features/scenario-config/timeline/station-lane";

import { formatHM } from "../live/engine";
import type { LiveChange, RunInputs, RunSnapshot, StationState } from "../live/types";
import { runTimelineStyles as styles } from "./RunTimeline.styles";

const STATE_TEXT: Record<StationState, string> = {
  starting: "Starting",
  working: "Working",
  "queue-full": "Queue full",
  "on-break": "On break",
  "off-shift": "Off shift",
  stopped: "Stopped",
};

type RunTimelineProps = {
  inputs: RunInputs;
  snapshot: RunSnapshot;
  changes: LiveChange[];
  onOpenStation: (id: string) => void;
};

/**
 * The run timeline: each station's blocks over the run, solid for work already done and
 * outlined for what is still planned, its breaks, a red line at now, then the warehouse events
 * and the live changes made so far.
 */
export function RunTimeline({
  inputs,
  snapshot,
  changes,
  onOpenStation,
}: RunTimelineProps): React.JSX.Element {
  const run = inputs.runHours;
  const nowPct = hourToPct(snapshot.nowH, run);
  const ended = snapshot.phase === "completed" || snapshot.phase === "stopped";
  const now = <span className={styles.now} style={{ left: `${nowPct}%` }} aria-hidden="true" />;

  return (
    <section className={styles.root} aria-label="Run timeline">
      <div className={styles.head}>
        <h2 className={styles.title}>Run timeline</h2>
        <p className={styles.subtitle}>
          {ended
            ? "What each station did over the run."
            : "Solid bars are finished work. Outlined is still planned."}
        </p>
      </div>
      <TimelineRuler runHours={run} />
      {inputs.stations.map((station, index) => {
        const live = snapshot.stations[index];
        const marks = breakMarks(station.schedule, run, {
          id: station.id,
          index,
          count: inputs.stations.length,
        });
        return (
          <TimelineLane
            key={station.id}
            runHours={run}
            height={46}
            label={
              <button
                type="button"
                className={styles.stationName}
                onClick={() => onOpenStation(station.id)}
              >
                <span
                  className={cn(
                    styles.dot,
                    live.state === "working" || live.state === "queue-full"
                      ? styles.dotOn
                      : styles.dotOff,
                  )}
                  aria-hidden="true"
                />
                <span>
                  <span className={styles.stationLabel}>{station.label}</span>
                  {!ended && <span className={styles.stationState}>{STATE_TEXT[live.state]}</span>}
                </span>
              </button>
            }
          >
            <div className={styles.offShift} aria-hidden="true" />
            {laneSegments(station.schedule, run).flatMap((segment) => {
              const end = segment.from + segment.hours;
              const cut = Math.min(Math.max(snapshot.nowH, segment.from), end);
              const parts = [];
              if (cut > segment.from) parts.push({ from: segment.from, to: cut, done: true });
              if (end > cut) parts.push({ from: cut, to: end, done: false });
              return parts.map((part) => (
                <div
                  key={`${segment.from}-${part.done}`}
                  className={cn(
                    styles.block,
                    styles[part.done ? (`${segment.mode}Done` as const) : segment.mode],
                  )}
                  style={{
                    left: `${hourToPct(part.from, run)}%`,
                    width: `${hourToPct(part.to - part.from, run)}%`,
                  }}
                  title={`${station.label}: ${MODE_LABELS[segment.mode]} ${formatHM(part.from)} – ${formatHM(part.to)}${part.done ? " (done)" : ""}`}
                >
                  {!part.done && part.from === segment.from ? MODE_LABELS[segment.mode] : ""}
                </div>
              ));
            })}
            {marks.map((mark) => (
              <i
                key={`${mark.kind}-${mark.at}`}
                aria-hidden="true"
                className={cn(styles.mark, mark.kind === "tea" && styles.markTea)}
                style={{ left: `${mark.leftPct}%`, width: `${mark.widthPct}%` }}
              />
            ))}
            {now}
          </TimelineLane>
        );
      })}
      <TimelineLane
        runHours={run}
        height={40}
        label={<span className={styles.rowLabel}>Warehouse events</span>}
      >
        {snapshot.incidents.map((incident) => (
          <i
            key={incident.title}
            className={cn(styles.incident, incident.fromH <= snapshot.nowH && styles.incidentPast)}
            style={{
              left: `${hourToPct(incident.fromH, run)}%`,
              width: `${hourToPct(incident.toH - incident.fromH, run)}%`,
            }}
            title={`${incident.title} at ${formatHM(incident.fromH)}`}
          />
        ))}
        {now}
      </TimelineLane>
      <TimelineLane
        runHours={run}
        height={40}
        label={<span className={styles.rowLabel}>Live changes</span>}
      >
        {changes.length === 0 ? <span className={styles.none}>None yet</span> : null}
        {changes.map((change, i) => (
          <i
            key={i}
            className={styles.change}
            style={{ left: `${hourToPct(change.atH, run)}%` }}
            title={
              change.kind === "bots"
                ? `${formatHM(change.atH)}: fleet changed to ${change.bots} bots`
                : `${formatHM(change.atH)}: ${change.stationId} turned ${change.on ? "on" : "off"}`
            }
          />
        ))}
        {now}
      </TimelineLane>
    </section>
  );
}
