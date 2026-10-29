import { cn } from "@/lib/utils";

import type { StationLive } from "../live/types";
import { StationStatePill } from "./StationStatePill";
import { stationsTableStyles as styles } from "./StationsTable.styles";

/** The Stations tab: each station's state, its queue and its operator wait, now. */
export function StationsTable({ stations }: { stations: StationLive[] }): React.JSX.Element {
  return (
    <section className={styles.root} aria-label="Stations">
      <div className={styles.head}>
        <h2 className={styles.title}>Stations</h2>
        <p className={styles.subtitle}>Queue full is congestion, not a failure.</p>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.th}>
              Station
            </th>
            <th scope="col" className={styles.th}>
              Now
            </th>
            <th scope="col" className={cn(styles.th, styles.num)}>
              Queue
            </th>
            <th scope="col" className={cn(styles.th, styles.num)}>
              Operator wait
            </th>
          </tr>
        </thead>
        <tbody>
          {stations.map((station) => (
            <tr
              key={station.id}
              className={cn(styles.row, station.state === "queue-full" && styles.rowWarn)}
            >
              <th scope="row" className={styles.name}>
                {station.label}
              </th>
              <td className={styles.td}>
                <StationStatePill station={station} />
              </td>
              <td className={cn(styles.td, styles.num)}>
                {station.queue === null ? "—" : `${station.queue} of ${station.queueLimit}`}
              </td>
              <td className={cn(styles.td, styles.num)}>
                {station.operatorWait === null ? "—" : `${station.operatorWait.toFixed(1)} s`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
