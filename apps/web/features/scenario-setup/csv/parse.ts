/** One data row of a CSV file, with the line it started on in the file (the header is line 1). */
export type CsvRow = { line: number; cells: string[] };

/** A parsed CSV file: lower-cased column names and the data rows under them. */
export type ParsedCsv = { header: string[]; rows: CsvRow[] };

const DELIMITERS = [",", "\t", ";"] as const;

/** Picks the delimiter that appears most often in the header line (comma if none appear). */
function detectDelimiter(headerLine: string): string {
  let best: string = ",";
  let bestCount = 0;
  for (const delimiter of DELIMITERS) {
    const count = headerLine.split(delimiter).length - 1;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Returns a function that reads a named column from a row ("" if the column or cell is missing).
 *
 * @param header - The parsed header, as returned by `parseCsv`.
 */
export function cellReader(header: string[]): (row: CsvRow, column: string) => string {
  const index = new Map(header.map((name, position) => [name, position]));
  return (row, column) => row.cells[index.get(column) ?? -1] ?? "";
}

/**
 * Parses CSV or TSV text. Handles quoted cells (including commas, doubled quotes and line
 * breaks inside them), Windows line endings and a leading byte-order mark, and skips blank
 * lines. Cells are trimmed. The delimiter is detected from the header line.
 *
 * @param text - The whole file as text.
 * @returns The header (trimmed, lower-case) and the data rows with their file line numbers.
 */
export function parseCsv(text: string): ParsedCsv {
  const source = text.replace(/^﻿/, "");
  const delimiter = detectDelimiter(source.split(/\r\n|\n|\r/, 1)[0] ?? "");

  const records: CsvRow[] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;

  const endRecord = (): void => {
    cells.push(cell);
    const isBlank = cells.length === 1 && cells[0].trim() === "";
    if (!isBlank) records.push({ line: recordLine, cells: cells.map((value) => value.trim()) });
    cells = [];
    cell = "";
  };

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === "\n") line++;
        cell += char;
      }
    } else if (char === '"' && cell === "") {
      inQuotes = true;
    } else if (char === delimiter) {
      cells.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      endRecord();
      line++;
      recordLine = line;
    } else {
      cell += char;
    }
  }
  if (cell !== "" || cells.length > 0) endRecord();

  const [headerRow, ...rows] = records;
  return {
    header: (headerRow?.cells ?? []).map((name) => name.toLowerCase()),
    rows,
  };
}
