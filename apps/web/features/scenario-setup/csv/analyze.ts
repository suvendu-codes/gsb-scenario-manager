import { DATA_TEMPLATES, MAX_FILE_SIZE_BYTES } from "../constants";
import type { DatasetRecord, DatasetSlot } from "../types";
import type { SkuRef } from "./cross-file";
import { cellReader, parseCsv } from "./parse";
import { computeProfile } from "./profile";
import { validateRows } from "./validate";

/**
 * Everything learned from reading one uploaded file.
 * `skuRefs` (inbound and outbound) and `knownSkus` (master data) are kept in the browser
 * only, to cross-check files against each other when the user validates.
 */
export type FileAnalysis = {
  record: DatasetRecord;
  skuRefs: SkuRef[];
  knownSkus: Set<string> | null;
};

function uploadRecord(
  slot: DatasetSlot,
  fileName: string,
  sizeBytes: number,
  issues: string[],
  now: Date,
): DatasetRecord {
  return {
    slot,
    fileName,
    source: "upload",
    sizeBytes,
    uploadedAt: now.toISOString(),
    valid: issues.length === 0,
    issues,
    profile: {},
  };
}

/**
 * Reads the text of an uploaded file: parses it, checks it against the dataset type's
 * template and rules, and works out the numbers for the charts.
 *
 * @param slot - Which dataset the file was uploaded for.
 * @param fileName - The file's name.
 * @param sizeBytes - The file's size.
 * @param text - The file's contents.
 * @param now - The upload time (a parameter so tests can fix it).
 */
export function analyzeCsv(
  slot: DatasetSlot,
  fileName: string,
  sizeBytes: number,
  text: string,
  now: Date = new Date(),
): FileAnalysis {
  const parsed = parseCsv(text);
  const issues = validateRows(slot, parsed);
  const record = uploadRecord(slot, fileName, sizeBytes, issues, now);

  const hasAllColumns = DATA_TEMPLATES[slot].columns.every((column) =>
    parsed.header.includes(column),
  );
  if (!hasAllColumns) return { record, skuRefs: [], knownSkus: null };

  record.profile = computeProfile(slot, parsed);

  const read = cellReader(parsed.header);
  const skus = parsed.rows
    .map((row) => ({ sku: read(row, "sku"), line: row.line }))
    .filter((ref) => ref.sku !== "");

  if (slot === "masterdata") {
    return { record, skuRefs: [], knownSkus: new Set(skus.map((ref) => ref.sku)) };
  }
  if (slot === "inbound" || slot === "outbound") {
    return { record, skuRefs: skus, knownSkus: null };
  }
  return { record, skuRefs: [], knownSkus: null };
}

/**
 * Reads and analyses a file the user chose. Files over the size limit are not read;
 * they are reported as invalid instead.
 *
 * @param slot - Which dataset the file was uploaded for.
 * @param file - The chosen file.
 */
export async function analyzeFile(slot: DatasetSlot, file: File): Promise<FileAnalysis> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const limitMb = MAX_FILE_SIZE_BYTES / (1024 * 1024);
    const record = uploadRecord(
      slot,
      file.name,
      file.size,
      [`the file is larger than ${limitMb} MB`],
      new Date(),
    );
    return { record, skuRefs: [], knownSkus: null };
  }
  return analyzeCsv(slot, file.name, file.size, await file.text());
}
