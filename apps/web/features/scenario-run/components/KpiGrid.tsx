import { cn } from "@/lib/utils";

import type { Kpi } from "../live/types";
import { kpiGridStyles as styles } from "./KpiGrid.styles";

const STATUS_TEXT = { ok: "OK", watch: "Watch", waiting: "Waiting", done: "Done" } as const;

/** "How the run is doing": one tile per measure, each saying whether it is on track. */
export function KpiGrid({
  kpis,
  windowLabel,
}: {
  kpis: Kpi[];
  windowLabel: string;
}): React.JSX.Element {
  return (
    <section aria-label="How the run is doing" className={styles.root}>
      <div className={styles.head}>
        <h2 className={styles.title}>How the run is doing</h2>
        <span className={styles.window}>{windowLabel}</span>
      </div>
      <ul className={styles.grid}>
        {kpis.map((kpi) => (
          <li key={kpi.id} className={styles.tile}>
            <div className={styles.tileHead}>
              <span className={styles.label}>{kpi.label}</span>
              <span className={cn(styles.status, styles[kpi.status])}>
                {STATUS_TEXT[kpi.status]}
              </span>
            </div>
            {kpi.value === null ? (
              <>
                <span className={styles.skeletonValue} aria-hidden="true" />
                <span className={styles.skeletonDetail} aria-hidden="true" />
              </>
            ) : (
              <>
                <p className={styles.valueRow}>
                  <span className={styles.value}>{kpi.value}</span>
                  <span className={styles.unit}>{kpi.unit}</span>
                </p>
                <p className={styles.detail}>{kpi.detail}</p>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
