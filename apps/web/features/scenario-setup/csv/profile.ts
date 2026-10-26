import type { DatasetProfile, DatasetSlot, VelocityLevel } from "../types";
import { cellReader, type ParsedCsv } from "./parse";

const HOURS_IN_DAY = 24;
const VELOCITY_ORDER = ["Fast", "Medium", "Slow"];

/** The hour (0-23) of an "HH:MM" time, or null if it is not a valid time. */
function hourOf(time: string): number | null {
  const match = /^([01]?\d|2[0-3]):[0-5]\d$/.exec(time);
  return match ? Number(match[1]) : null;
}

function quantityOf(value: string): number {
  const quantity = Number(value);
  return value !== "" && Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
}

/**
 * Works out what the charts show for a file:
 * - inbound: units received per hour, from the `eta` column
 * - outbound: orders per hour (each order counted once, at its `pbt` hour), plus the total
 *   number of order lines and units
 * - masterdata: on-hand and capacity per velocity class (Fast, Medium, Slow)
 * - mockput: nothing
 *
 * Rows with an invalid time or quantity are skipped. Call this only for files whose
 * columns match the template.
 *
 * @param slot - Which dataset the file is.
 * @param parsed - The parsed file.
 */
export function computeProfile(slot: DatasetSlot, parsed: ParsedCsv): DatasetProfile {
  const read = cellReader(parsed.header);

  if (slot === "inbound") {
    const hourly = new Array<number>(HOURS_IN_DAY).fill(0);
    for (const row of parsed.rows) {
      const hour = hourOf(read(row, "eta"));
      if (hour !== null) hourly[hour] += quantityOf(read(row, "qty"));
    }
    return { hourly };
  }

  if (slot === "outbound") {
    const hourly = new Array<number>(HOURS_IN_DAY).fill(0);
    const seenOrders = new Set<string>();
    let totalOrderlines = 0;
    let totalUnits = 0;
    for (const row of parsed.rows) {
      const orderId = read(row, "order_id");
      if (orderId === "") continue;
      totalOrderlines += 1;
      totalUnits += quantityOf(read(row, "qty"));
      const hour = hourOf(read(row, "pbt"));
      if (hour !== null && !seenOrders.has(orderId)) {
        seenOrders.add(orderId);
        hourly[hour] += 1;
      }
    }
    return { hourly, totalOrderlines, totalUnits };
  }

  if (slot === "masterdata") {
    const byClass = new Map<string, { onHand: number; capacity: number }>();
    for (const row of parsed.rows) {
      const name = VELOCITY_ORDER.find(
        (candidate) => candidate.toLowerCase() === read(row, "velocity_class").toLowerCase(),
      );
      if (!name) continue;
      const level = byClass.get(name) ?? { onHand: 0, capacity: 0 };
      level.onHand += Math.max(0, Number(read(row, "on_hand")) || 0);
      level.capacity += Math.max(0, Number(read(row, "capacity")) || 0);
      byClass.set(name, level);
    }
    const velocity: VelocityLevel[] = VELOCITY_ORDER.filter((name) => byClass.has(name)).map(
      (name) => ({ label: name, ...byClass.get(name)! }),
    );
    return { velocity };
  }

  return {};
}
