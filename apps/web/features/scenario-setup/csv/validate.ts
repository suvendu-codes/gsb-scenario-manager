import { DATA_TEMPLATES } from "../constants";
import type { DatasetSlot } from "../types";
import type { ParsedCsv } from "./parse";
import { describeRows } from "./rows";

type Get = (column: string) => string;
/** Looks at one row and returns what is wrong with it, or null if it is fine. */
type Rule = (get: Get) => string | null;

const TIME_OF_DAY = /^([01]?\d|2[0-3]):[0-5]\d$/;
const VELOCITY_CLASSES = ["Fast", "Medium", "Slow"];

function isNumber(value: string): boolean {
  return value !== "" && Number.isFinite(Number(value));
}

function minutes(time: string): number {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

const required =
  (column: string): Rule =>
  (get) =>
    get(column) === "" ? `"${column}" is blank` : null;

const positiveNumber =
  (column: string): Rule =>
  (get) =>
    isNumber(get(column)) && Number(get(column)) > 0
      ? null
      : `"${column}" must be a number greater than 0`;

const nonNegativeNumber =
  (column: string): Rule =>
  (get) =>
    isNumber(get(column)) && Number(get(column)) >= 0
      ? null
      : `"${column}" must be a number, 0 or more`;

const positiveInteger =
  (column: string): Rule =>
  (get) =>
    isNumber(get(column)) && Number.isInteger(Number(get(column))) && Number(get(column)) > 0
      ? null
      : `"${column}" must be a whole number greater than 0`;

const timeOfDay =
  (column: string): Rule =>
  (get) =>
    TIME_OF_DAY.test(get(column)) ? null : `"${column}" must be a time like HH:MM`;

const velocityClass: Rule = (get) =>
  VELOCITY_CLASSES.some((name) => name.toLowerCase() === get("velocity_class").toLowerCase())
    ? null
    : `"velocity_class" must be one of ${VELOCITY_CLASSES.join(", ")}`;

const pickByBeforePackBy: Rule = (get) =>
  TIME_OF_DAY.test(get("pbt")) &&
  TIME_OF_DAY.test(get("pat")) &&
  minutes(get("pbt")) > minutes(get("pat"))
    ? "pick-by time (pbt) is later than pack-by time (pat)"
    : null;

const onHandWithinCapacity: Rule = (get) =>
  isNumber(get("on_hand")) &&
  isNumber(get("capacity")) &&
  Number(get("on_hand")) > Number(get("capacity"))
    ? '"on_hand" is greater than "capacity"'
    : null;

/** The checks run on every row of a file, by dataset type. */
const ROW_RULES: Record<DatasetSlot, Rule[]> = {
  inbound: [
    required("receipt_id"),
    required("sku"),
    required("uom"),
    positiveNumber("qty"),
    timeOfDay("eta"),
  ],
  outbound: [
    required("order_id"),
    required("sku"),
    required("uom"),
    positiveInteger("line_no"),
    positiveNumber("qty"),
    timeOfDay("pbt"),
    timeOfDay("pat"),
    pickByBeforePackBy,
  ],
  masterdata: [
    required("sku"),
    required("bin_location"),
    velocityClass,
    nonNegativeNumber("on_hand"),
    positiveNumber("capacity"),
    onHandWithinCapacity,
  ],
  mockput: [
    required("put_zone"),
    required("carrier_type"),
    positiveInteger("capacity"),
    positiveInteger("priority"),
  ],
};

/** The column(s) that must be unique across rows, by dataset type. */
const UNIQUE_KEYS: Record<DatasetSlot, string[]> = {
  inbound: ["receipt_id", "sku"],
  outbound: ["order_id", "line_no"],
  masterdata: ["sku"],
  mockput: ["put_zone"],
};

/**
 * Checks a parsed file against its dataset type's template and rules.
 * If columns are missing or there are no rows, only that is reported, since the
 * rows cannot be checked meaningfully. Otherwise every problem found is reported once,
 * with the rows it affects.
 *
 * @param slot - Which dataset the file is meant to be.
 * @param parsed - The parsed file.
 * @returns Human-readable issues; empty when the file is valid.
 */
export function validateRows(slot: DatasetSlot, parsed: ParsedCsv): string[] {
  const template = DATA_TEMPLATES[slot];

  const missing = template.columns.filter((column) => !parsed.header.includes(column));
  if (missing.length > 0) {
    return [
      `missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")} (download the template to see the expected columns)`,
    ];
  }
  if (parsed.rows.length === 0) return ["the file has no data rows"];

  const columnIndex = new Map(parsed.header.map((name, index) => [name, index]));
  const problems = new Map<string, number[]>();
  const addProblem = (problem: string, line: number): void => {
    problems.set(problem, [...(problems.get(problem) ?? []), line]);
  };

  const seenKeys = new Set<string>();
  const uniqueKey = UNIQUE_KEYS[slot];

  for (const row of parsed.rows) {
    const get: Get = (column) => row.cells[columnIndex.get(column) ?? -1] ?? "";

    if (row.cells.length !== parsed.header.length) {
      addProblem("has a different number of columns than the header", row.line);
    }
    for (const rule of ROW_RULES[slot]) {
      const problem = rule(get);
      if (problem) addProblem(problem, row.line);
    }

    const key = uniqueKey.map(get).join("\u0000");
    if (seenKeys.has(key)) addProblem(`duplicate ${uniqueKey.join(" + ")}`, row.line);
    seenKeys.add(key);
  }

  return [...problems].map(([problem, lines]) => describeRows(lines, problem));
}
