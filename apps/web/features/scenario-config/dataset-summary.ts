import { DATASET_SLOTS } from "@/features/scenario-setup/constants";
import type { DatasetRecord } from "@/features/scenario-setup/types";

const format = (value: number): string => Math.round(value).toLocaleString("en-US");

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

/**
 * One line about a dataset for the overview, such as "Inbound · 5,335 units a day".
 *
 * @param record - The attached dataset.
 */
export function datasetSummary(record: DatasetRecord): string {
  const label = DATASET_SLOTS.find((slot) => slot.key === record.slot)?.label ?? record.slot;
  const { hourly, totalOrderlines, velocity } = record.profile;

  switch (record.slot) {
    case "inbound":
      return hourly ? `${label} · ${format(sum(hourly))} units a day` : label;
    case "outbound":
      return totalOrderlines !== undefined
        ? `${label} · ${format(totalOrderlines)} order lines`
        : label;
    case "masterdata":
      return velocity
        ? `${label} · ${format(sum(velocity.map((v) => v.onHand)))} units on hand`
        : label;
    case "mockput":
      return `${label} · Mock put layout`;
  }
}
