const MAX_RANGES_SHOWN = 4;

/**
 * Turns line numbers into a short label for an error message: "row 7",
 * "rows 3, 9-12" or "rows 2, 5, 8, 11, …" when there are many.
 *
 * @param lines - File line numbers, in any order; duplicates are ignored.
 */
export function formatRows(lines: number[]): string {
  const sorted = [...new Set(lines)].sort((a, b) => a - b);
  if (sorted.length === 1) return `row ${sorted[0]}`;

  const ranges: string[] = [];
  let start = sorted[0];
  let previous = sorted[0];
  for (const line of sorted.slice(1)) {
    if (line === previous + 1) {
      previous = line;
      continue;
    }
    ranges.push(start === previous ? `${start}` : `${start}-${previous}`);
    start = line;
    previous = line;
  }
  ranges.push(start === previous ? `${start}` : `${start}-${previous}`);

  const shown = ranges.slice(0, MAX_RANGES_SHOWN).join(", ");
  return `rows ${shown}${ranges.length > MAX_RANGES_SHOWN ? ", …" : ""}`;
}

/**
 * Builds one issue message: where the problem is, what it is, and how many rows it affects.
 * Example: "rows 4, 9-11: \"qty\" must be a number greater than 0 (4 rows)".
 *
 * @param lines - File line numbers of the affected rows.
 * @param problem - What is wrong with them.
 */
export function describeRows(lines: number[], problem: string): string {
  const count = new Set(lines).size;
  return `${formatRows(lines)}: ${problem}${count > 1 ? ` (${count} rows)` : ""}`;
}
