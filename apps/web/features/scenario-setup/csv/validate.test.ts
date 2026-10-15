import { describe, expect, it } from "vitest";

import { parseCsv } from "./parse";
import { validateRows } from "./validate";

const lines = (...rows: string[]): string => rows.join("\n");

const INBOUND_HEADER = "receipt_id,dock_door,sku,qty,uom,eta";
const OUTBOUND_HEADER = "order_id,line_no,sku,priority,order_type,pbt,pat,qty,uom";
const MASTER_HEADER = "sku,bin_location,velocity_class,on_hand,capacity,bin_tag";
const MOCKPUT_HEADER = "put_zone,carrier_type,capacity,priority";

describe("validateRows: whole-file problems", () => {
  it("accepts a valid file", () => {
    const parsed = parseCsv(lines(INBOUND_HEADER, "R1,D-04,SKU-1,120,EA,08:00"));

    expect(validateRows("inbound", parsed)).toEqual([]);
  });

  it("lists the missing columns and stops there", () => {
    const parsed = parseCsv(lines("receipt_id,sku", "R1,SKU-1"));

    const issues = validateRows("inbound", parsed);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("missing columns: dock_door, qty, uom, eta");
  });

  it("uses the singular for one missing column", () => {
    const parsed = parseCsv(lines("receipt_id,dock_door,sku,qty,uom", "R1,D,S,1,EA"));

    expect(validateRows("inbound", parsed)[0]).toContain("missing column: eta");
  });

  it("reports a file with only a header", () => {
    expect(validateRows("inbound", parseCsv(INBOUND_HEADER))).toEqual([
      "the file has no data rows",
    ]);
  });

  it("matches column names ignoring case and allows extra columns", () => {
    const parsed = parseCsv(lines(INBOUND_HEADER.toUpperCase() + ",NOTES", "R1,D,S,1,EA,08:00,hi"));

    expect(validateRows("inbound", parsed)).toEqual([]);
  });
});

describe("validateRows: inbound rows", () => {
  it("reports each kind of problem with its row numbers", () => {
    const parsed = parseCsv(
      lines(
        INBOUND_HEADER,
        "R1,D,SKU-1,10,EA,08:00",
        "R2,D,SKU-2,-5,EA,09:00",
        "R3,D,SKU-3,abc,EA,09:30",
        "R4,D,,5,EA,25:99",
        "R1,D,SKU-1,10,EA,08:00",
      ),
    );

    const issues = validateRows("inbound", parsed);

    expect(issues).toContain('rows 3-4: "qty" must be a number greater than 0 (2 rows)');
    expect(issues).toContain('row 5: "sku" is blank');
    expect(issues).toContain('row 5: "eta" must be a time like HH:MM');
    expect(issues).toContain("row 6: duplicate receipt_id + sku");
  });

  it("allows the same receipt with different SKUs", () => {
    const parsed = parseCsv(
      lines(INBOUND_HEADER, "R1,D,SKU-1,1,EA,08:00", "R1,D,SKU-2,1,EA,08:00"),
    );

    expect(validateRows("inbound", parsed)).toEqual([]);
  });

  it("flags a row with a different number of columns", () => {
    const parsed = parseCsv(lines(INBOUND_HEADER, "R1,D,SKU-1,10"));

    expect(validateRows("inbound", parsed)).toContain(
      "row 2: has a different number of columns than the header",
    );
  });
});

describe("validateRows: outbound rows", () => {
  const ok = "O1,1,SKU-1,Standard,Pick,08:00,12:00,4,EA";

  it("accepts a valid file", () => {
    expect(validateRows("outbound", parseCsv(lines(OUTBOUND_HEADER, ok)))).toEqual([]);
  });

  it("flags a pick-by time later than the pack-by time", () => {
    const parsed = parseCsv(lines(OUTBOUND_HEADER, "O1,1,SKU-1,Standard,Pick,14:00,12:00,4,EA"));

    expect(validateRows("outbound", parsed)).toEqual([
      "row 2: pick-by time (pbt) is later than pack-by time (pat)",
    ]);
  });

  it("flags a bad line number and a duplicate order line", () => {
    const parsed = parseCsv(
      lines(OUTBOUND_HEADER, ok, ok, "O2,0,SKU-1,Standard,Pick,08:00,12:00,4,EA"),
    );

    const issues = validateRows("outbound", parsed);

    expect(issues).toContain("row 3: duplicate order_id + line_no");
    expect(issues).toContain('row 4: "line_no" must be a whole number greater than 0');
  });
});

describe("validateRows: master data and mock put", () => {
  it("flags an unknown velocity class and on-hand above capacity", () => {
    const parsed = parseCsv(
      lines(
        MASTER_HEADER,
        "S1,A-1,Fast,10,20,single",
        "S2,A-2,Turbo,10,20,single",
        "S3,A-3,slow,30,20,single",
      ),
    );

    const issues = validateRows("masterdata", parsed);

    expect(issues).toContain('row 3: "velocity_class" must be one of Fast, Medium, Slow');
    expect(issues).toContain('row 4: "on_hand" is greater than "capacity"');
    expect(issues).toHaveLength(2);
  });

  it("flags a blank bin location and a duplicate SKU", () => {
    const parsed = parseCsv(lines(MASTER_HEADER, "S1,,Fast,1,2,x", "S1,A-1,Fast,1,2,x"));

    const issues = validateRows("masterdata", parsed);

    expect(issues).toContain('row 2: "bin_location" is blank');
    expect(issues).toContain("row 3: duplicate sku");
  });

  it("validates mock put rows", () => {
    expect(validateRows("mockput", parseCsv(lines(MOCKPUT_HEADER, "PZ-01,Tote,48,1")))).toEqual([]);
    expect(validateRows("mockput", parseCsv(lines(MOCKPUT_HEADER, "PZ-01,Tote,4.5,1")))).toEqual([
      'row 2: "capacity" must be a whole number greater than 0',
    ]);
  });
});
