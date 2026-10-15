import { describe, expect, it } from "vitest";

import { cellReader, parseCsv } from "./parse";

const lines = (...rows: string[]): string => rows.join("\n");

describe("parseCsv", () => {
  it("returns a lower-cased, trimmed header and trimmed rows with their file line numbers", () => {
    const parsed = parseCsv(lines(" SKU , Qty ", " A1 , 5 ", "B2,7"));

    expect(parsed.header).toEqual(["sku", "qty"]);
    expect(parsed.rows).toEqual([
      { line: 2, cells: ["A1", "5"] },
      { line: 3, cells: ["B2", "7"] },
    ]);
  });

  it("handles quoted cells with commas and doubled quotes", () => {
    const parsed = parseCsv(lines("name,note", '"Smith, J","said ""hi"""'));

    expect(parsed.rows[0].cells).toEqual(["Smith, J", 'said "hi"']);
  });

  it("keeps line numbers right when a quoted cell contains a line break", () => {
    const parsed = parseCsv(lines("a,b", '"two\nlines",x', "next,y"));

    expect(parsed.rows.map((row) => row.line)).toEqual([2, 4]);
    expect(parsed.rows[0].cells[0]).toBe("two\nlines");
  });

  it("handles Windows line endings and a leading byte-order mark", () => {
    const parsed = parseCsv("﻿a,b\r\n1,2\r\n3,4\r\n");

    expect(parsed.header).toEqual(["a", "b"]);
    expect(parsed.rows).toEqual([
      { line: 2, cells: ["1", "2"] },
      { line: 3, cells: ["3", "4"] },
    ]);
  });

  it("skips blank lines but still counts them in line numbers", () => {
    const parsed = parseCsv(lines("a,b", "1,2", "", "3,4"));

    expect(parsed.rows.map((row) => row.line)).toEqual([2, 4]);
  });

  it("reads the last row when there is no trailing newline", () => {
    expect(parseCsv("a,b\n1,2").rows).toHaveLength(1);
  });

  it("detects tab and semicolon delimiters from the header", () => {
    expect(parseCsv("a\tb\n1\t2").rows[0].cells).toEqual(["1", "2"]);
    expect(parseCsv("a;b\n1;2").rows[0].cells).toEqual(["1", "2"]);
  });

  it("returns an empty result for empty text", () => {
    expect(parseCsv("")).toEqual({ header: [], rows: [] });
  });
});

describe("cellReader", () => {
  const parsed = parseCsv(lines("sku,qty", "A1,5"));
  const read = cellReader(parsed.header);

  it("reads a cell by column name", () => {
    expect(read(parsed.rows[0], "qty")).toBe("5");
  });

  it("returns an empty string for an unknown column or a missing cell", () => {
    expect(read(parsed.rows[0], "nope")).toBe("");
    expect(read({ line: 9, cells: ["only"] }, "qty")).toBe("");
  });
});
