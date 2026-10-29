import type { MapStation } from "../../upstream/stations";
import { stationDetailsStyles as styles } from "./StationDetails.styles";

const NOT_GIVEN = "Not given";
const MODE_LABELS = { pick: "Pick", put: "Put", audit: "Audit" } as const;
const STATUS_LABELS = {
  connected: "Connected",
  disconnected: "Disconnected",
  unknown: NOT_GIVEN,
} as const;

const given = (value: number | null) => (value === null ? NOT_GIVEN : String(value));
const list = (values: string[]) => (values.length > 0 ? values.join(", ") : NOT_GIVEN);

/**
 * A station's registry details, collapsed by default. They are shown for reference only; they
 * are edited in the site registry, not here.
 *
 * @param station - The station as the site registry describes it.
 */
export function StationDetails({ station }: { station: MapStation }): React.JSX.Element {
  const rows: Array<[string, string]> = [
    ["Station id", station.id],
    ["Type", station.registryType],
    ["Allowed modes", list(station.allowedModes.map((mode) => MODE_LABELS[mode]))],
    ["Status", STATUS_LABELS[station.status]],
    ["Systems", list(station.systems.map((system) => system.toUpperCase()))],
    ["Location", station.location ?? NOT_GIVEN],
    ["Pick direction", given(station.pickDirection)],
    ["Front positions", given(station.frontPositions)],
    ["Queue length", given(station.queueLength)],
    ["Roll cage docks", given(station.rollcageDocks)],
    ["Registry URL", station.registryUrl ?? NOT_GIVEN],
  ];

  return (
    <details className={styles.root}>
      <summary className={styles.summary}>Station details</summary>
      <div className={styles.body}>
        <p className={styles.note}>
          From the site registry. Shown for reference; edited in the registry, not here.
        </p>
        <dl className={styles.list}>
          {rows.map(([term, value]) => (
            <div key={term} className={styles.row}>
              <dt className={styles.term}>{term}</dt>
              <dd className={styles.value}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}
