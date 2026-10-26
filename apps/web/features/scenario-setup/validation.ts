import { REQUIRED_SLOTS } from "./constants";
import { findUnknownSkuIssues } from "./csv/cross-file";
import type { FileAnalysis } from "./csv/analyze";
import type { DatasetSlot, ScenarioDatasets } from "./types";

/** The outcome of validating a scenario's datasets. */
export type ValidationResult = {
  /** Problems found, by dataset. Only datasets with problems appear. */
  issues: Partial<Record<DatasetSlot, string[]>>;
  /** Total number of problems across all datasets. */
  issueCount: number;
  /** Number of datasets with at least one problem. */
  fileCount: number;
  /** True when every required dataset is present and there are no problems. */
  passed: boolean;
};

/**
 * True when every required dataset (inbound, outbound, master data) has a file.
 *
 * @param datasets - The scenario's datasets.
 */
export function hasRequiredDatasets(datasets: ScenarioDatasets): boolean {
  return REQUIRED_SLOTS.every((slot) => datasets[slot] !== null);
}

/**
 * Validates a scenario's datasets: each file's own problems, plus a cross-check that the
 * SKUs in the inbound and outbound files exist in the master data file. The cross-check
 * only runs for files uploaded in this browser session, since only then do we still have
 * their contents; it is skipped for sample files and after a page refresh.
 *
 * @param datasets - The scenario's datasets.
 * @param analyses - What was learned from files uploaded in this session, by dataset.
 */
export function validateScenarioDatasets(
  datasets: ScenarioDatasets,
  analyses: Partial<Record<DatasetSlot, FileAnalysis>>,
): ValidationResult {
  const knownSkus = analyses.masterdata?.knownSkus ?? null;
  const issues: Partial<Record<DatasetSlot, string[]>> = {};

  for (const slot of Object.keys(datasets) as DatasetSlot[]) {
    const record = datasets[slot];
    if (!record) continue;

    const slotIssues = [...record.issues];
    const skuRefs = analyses[slot]?.skuRefs ?? [];
    if (knownSkus && skuRefs.length > 0) {
      slotIssues.push(...findUnknownSkuIssues(skuRefs, knownSkus));
    }
    if (slotIssues.length > 0) issues[slot] = slotIssues;
  }

  const lists = Object.values(issues);
  const issueCount = lists.reduce((total, list) => total + list.length, 0);
  return {
    issues,
    issueCount,
    fileCount: lists.length,
    passed: hasRequiredDatasets(datasets) && issueCount === 0,
  };
}
