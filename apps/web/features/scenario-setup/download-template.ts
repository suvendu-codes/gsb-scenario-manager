import { DATA_TEMPLATES } from "./constants";
import type { DatasetSlot } from "./types";

/**
 * The text of a dataset's CSV template: the column names and one example row.
 *
 * @param slot - Which dataset's template.
 */
export function templateCsv(slot: DatasetSlot): string {
  const { columns, exampleRow } = DATA_TEMPLATES[slot];
  return `${columns.join(",")}\n${exampleRow.join(",")}\n`;
}

/**
 * Downloads a dataset's CSV template in the browser.
 *
 * @param slot - Which dataset's template.
 */
export function downloadTemplate(slot: DatasetSlot): void {
  const url = URL.createObjectURL(new Blob([templateCsv(slot)], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = DATA_TEMPLATES[slot].filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
