import type { ScenarioDatasets } from "../../types";
import { BarChart } from "./BarChart";
import { InventoryBars } from "./InventoryBars";
import { orderProfileStyles as styles } from "./OrderProfile.styles";

const EMPTY_DAY = new Array<number>(24).fill(0);

/**
 * The "Order profile" card: inventory levels by SKU velocity, units received per hour, and
 * orders released per hour, all drawn from the datasets attached to the scenario.
 *
 * @param datasets - The scenario's datasets.
 */
export function OrderProfile({ datasets }: { datasets: ScenarioDatasets }): React.JSX.Element {
  const inbound = datasets.inbound?.profile.hourly ?? EMPTY_DAY;
  const outboundProfile = datasets.outbound?.profile;
  const outbound = outboundProfile?.hourly ?? EMPTY_DAY;
  const levels = datasets.masterdata?.profile.velocity ?? [];

  const totalOrders = outbound.reduce((sum, value) => sum + value, 0);
  const totalOrderlines = outboundProfile?.totalOrderlines;
  const totalUnits = outboundProfile?.totalUnits;
  const averages =
    totalOrders > 0 && totalOrderlines && totalUnits
      ? { linesPerOrder: totalOrderlines / totalOrders, unitsPerLine: totalUnits / totalOrderlines }
      : null;

  return (
    <section className={styles.root} aria-labelledby="order-profile-title">
      <h2 id="order-profile-title" className={styles.title}>
        Order profile
        <span className={styles.titleSub}>
          {" "}
          — from the selected datasets, for a feel of this scenario’s traffic
        </span>
      </h2>
      <span className={styles.note}>Dataset profile distribution can be modified from WMS.</span>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            Inventory levels <span className={styles.cardSub}>— by SKU velocity</span>
          </h3>
          <InventoryBars levels={levels} />
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            Inbound <span className={styles.cardSub}>— units received, by hour</span>
          </h3>
          <BarChart
            values={inbound}
            label="Inbound units received, by hour"
            unit="units"
            barClassName="fill-chart-inbound"
          />
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            Outbound <span className={styles.cardSub}>— orders released, by hour</span>
          </h3>
          <BarChart
            values={outbound}
            label="Outbound orders released, by hour"
            unit="orders"
            barClassName="fill-accent"
          />
          {averages && (
            <p className={styles.averages}>
              avg {averages.linesPerOrder.toFixed(1)} orderlines/order · avg{" "}
              {averages.unitsPerLine.toFixed(1)} units/orderline
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
