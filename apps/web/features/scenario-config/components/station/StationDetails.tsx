import type { StationInfo } from "../../types";
import { stationDetailsStyles as styles } from "./StationDetails.styles";

/**
 * A station's registry details, collapsed by default. They are shown for reference only; they
 * are edited in the site registry, not here.
 *
 * @param station - The station as the site registry describes it.
 */
export function StationDetails({ station }: { station: StationInfo }): React.JSX.Element {
  const rows: Array<[string, string]> = [
    ["Type", station.type],
    ["Category", station.category],
    ["Location", station.location],
    ["Pick direction", String(station.pickDirection)],
    ["Status", station.status === "connected" ? "Connected" : "Disconnected"],
    ["Eligible system", station.eligibleSystem.toUpperCase()],
    ["Registry URL", station.registryUrl],
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
