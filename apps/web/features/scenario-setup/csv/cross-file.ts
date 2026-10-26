import { describeRows } from "./rows";

/** A SKU mentioned on one row of an inbound or outbound file. */
export type SkuRef = { sku: string; line: number };

const MAX_SKUS_REPORTED = 3;

/**
 * Finds SKUs used by an inbound or outbound file that the master data file does not list.
 * Reports up to three SKUs by name, then how many more there are.
 *
 * @param refs - The SKUs the file uses, with their line numbers.
 * @param knownSkus - The SKUs in the master data file.
 * @returns Issue messages; empty when every SKU is known.
 */
export function findUnknownSkuIssues(refs: SkuRef[], knownSkus: Set<string>): string[] {
  const linesBySku = new Map<string, number[]>();
  for (const { sku, line } of refs) {
    if (knownSkus.has(sku)) continue;
    linesBySku.set(sku, [...(linesBySku.get(sku) ?? []), line]);
  }

  const unknown = [...linesBySku];
  const issues = unknown
    .slice(0, MAX_SKUS_REPORTED)
    .map(([sku, lines]) => describeRows(lines, `${sku} is not present in the master data file`));

  const remaining = unknown.length - MAX_SKUS_REPORTED;
  if (remaining > 0) {
    issues.push(
      `${remaining} more SKU${remaining > 1 ? "s are" : " is"} not present in the master data file`,
    );
  }
  return issues;
}
