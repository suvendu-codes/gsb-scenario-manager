import type { VelocityLevel } from "../../types";
import { inventoryBarsStyles as styles } from "./InventoryBars.styles";

/**
 * Inventory levels by SKU velocity class: for each of Fast, Medium and Slow, a bar of
 * on-hand stock against capacity with the figures beside it.
 *
 * @param levels - On-hand and capacity per velocity class.
 */
export function InventoryBars({ levels }: { levels: VelocityLevel[] }): React.JSX.Element {
  if (levels.length === 0) return <p className={styles.empty}>No data in this file.</p>;

  return (
    <div>
      {levels.map(({ label, onHand, capacity }) => {
        const percent = capacity > 0 ? Math.min(100, Math.round((onHand / capacity) * 100)) : 0;
        return (
          <div key={label} className={styles.row}>
            <div className={styles.rowTop}>
              <span className={styles.name}>{label}</span>
              <span className={styles.figures}>
                {onHand.toLocaleString("en-US")} / {capacity.toLocaleString("en-US")} ({percent}%)
              </span>
            </div>
            <div
              className={styles.track}
              role="progressbar"
              aria-label={`${label} inventory`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-valuetext={`${onHand} of ${capacity}, ${percent}%`}
            >
              <div className={styles.fill} style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
