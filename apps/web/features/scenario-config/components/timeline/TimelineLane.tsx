import { ruler } from "../../timeline/geometry";
import { timelineLaneStyles as styles } from "./TimelineLane.styles";

type TimelineLaneProps = {
  /** The lane's name, in the left column. */
  label: React.ReactNode;
  runHours: number;
  /** Height of the track, in pixels. */
  height?: number;
  children?: React.ReactNode;
};

/**
 * One row of a timeline card: a label on the left and a track on the right, with a dashed line
 * every hour. Children are positioned on the track by percentage of the run.
 */
export function TimelineLane({
  label,
  runHours,
  height = 46,
  children,
}: TimelineLaneProps): React.JSX.Element {
  return (
    <div className={styles.root}>
      <div className={styles.label}>{label}</div>
      <div className={styles.track} style={{ height }}>
        {ruler(runHours).hours.map((hour) => (
          <i key={hour.offset} className={styles.gridLine} style={{ left: `${hour.pct}%` }} />
        ))}
        {children}
      </div>
    </div>
  );
}

/** The hour ruler above a card's lanes: `0h` to the run length, with quarter-hour dots. */
export function TimelineRuler({ runHours }: { runHours: number }): React.JSX.Element {
  const { hours, dots } = ruler(runHours);
  return (
    <div className={styles.root} aria-hidden="true">
      <div />
      <div className={styles.axis}>
        {dots.map((pct) => (
          <span key={pct} className={styles.dot} style={{ left: `${pct}%` }} />
        ))}
        {hours.map((hour) => (
          <span key={hour.offset} className={styles.hour} style={{ left: `${hour.pct}%` }}>
            {hour.label}
          </span>
        ))}
      </div>
    </div>
  );
}
