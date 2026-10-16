import { describe, expect, it } from "vitest";

import { MAX_FILE_SIZE_BYTES } from "../constants";
import { analyzeCsv, analyzeFile } from "./analyze";
import { findUnknownSkuIssues } from "./cross-file";

const NOW = new Date("2026-10-15T10:00:00.000Z");
const lines = (...rows: string[]): string => rows.join("\n");

describe("analyzeCsv", () => {
  it("builds a valid upload record with a profile and the SKUs it uses", () => {
    const text = lines(
      "receipt_id,dock_door,sku,qty,uom,eta",
      "R1,D,SKU-1,100,EA,08:00",
      "R2,D,SKU-2,50,EA,09:00",
    );

    const analysis = analyzeCsv("inbound", "in.csv", text.length, text, NOW);

    expect(analysis.record).toMatchObject({
      slot: "inbound",
      fileName: "in.csv",
      source: "upload",
      valid: true,
      issues: [],
      uploadedAt: "2026-10-15T10:00:00.000Z",
    });
    expect(analysis.record.profile.hourly?.[8]).toBe(100);
    expect(analysis.skuRefs).toEqual([
      { sku: "SKU-1", line: 2 },
      { sku: "SKU-2", line: 3 },
    ]);
    expect(analysis.knownSkus).toBeNull();
  });

  it("marks a file with problems as invalid but still charts it", () => {
    const text = lines("receipt_id,dock_door,sku,qty,uom,eta", "R1,D,SKU-1,-1,EA,08:00");

    const { record } = analyzeCsv("inbound", "bad.csv", text.length, text, NOW);

    expect(record.valid).toBe(false);
    expect(record.issues).toEqual(['row 2: "qty" must be a number greater than 0']);
  });

  it("gives no profile or SKUs when columns are missing", () => {
    const analysis = analyzeCsv("inbound", "x.csv", 10, "a,b\n1,2", NOW);

    expect(analysis.record.valid).toBe(false);
    expect(analysis.record.profile).toEqual({});
    expect(analysis.skuRefs).toEqual([]);
  });

  it("collects the known SKUs of a master data file", () => {
    const text = lines(
      "sku,bin_location,velocity_class,on_hand,capacity,bin_tag",
      "SKU-1,A,Fast,1,2,x",
      "SKU-2,B,Slow,1,2,x",
    );

    const analysis = analyzeCsv("masterdata", "md.csv", text.length, text, NOW);

    expect(analysis.knownSkus).toEqual(new Set(["SKU-1", "SKU-2"]));
    expect(analysis.skuRefs).toEqual([]);
  });
});

describe("analyzeFile", () => {
  it("reads a File and analyses its text", async () => {
    const text = lines("put_zone,carrier_type,capacity,priority", "PZ-01,Tote,48,1");
    const file = new File([text], "mockput.csv", { type: "text/csv" });

    const { record } = await analyzeFile("mockput", file);

    expect(record).toMatchObject({ fileName: "mockput.csv", valid: true, sizeBytes: file.size });
  });

  it("does not read a file over the size limit, and reports it as invalid", async () => {
    const file = new File([new Uint8Array(MAX_FILE_SIZE_BYTES + 1)], "huge.csv");

    const { record } = await analyzeFile("inbound", file);

    expect(record.valid).toBe(false);
    expect(record.issues).toEqual(["the file is larger than 10 MB"]);
  });
});

describe("findUnknownSkuIssues", () => {
  const known = new Set(["SKU-1"]);

  it("is empty when every SKU is known", () => {
    expect(findUnknownSkuIssues([{ sku: "SKU-1", line: 2 }], known)).toEqual([]);
  });

  it("names unknown SKUs with the rows that use them", () => {
    const refs = [
      { sku: "SKU-9", line: 2 },
      { sku: "SKU-9", line: 3 },
      { sku: "SKU-1", line: 4 },
    ];

    expect(findUnknownSkuIssues(refs, known)).toEqual([
      "rows 2-3: SKU-9 is not present in the master data file (2 rows)",
    ]);
  });

  it("names three SKUs, then counts the rest", () => {
    const refs = ["A", "B", "C", "D", "E"].map((sku, index) => ({ sku, line: index + 2 }));

    const issues = findUnknownSkuIssues(refs, known);

    expect(issues).toHaveLength(4);
    expect(issues[3]).toBe("2 more SKUs are not present in the master data file");
  });
});
