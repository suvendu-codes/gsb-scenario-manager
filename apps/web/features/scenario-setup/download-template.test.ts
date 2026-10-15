import { describe, expect, it } from "vitest";

import { DATA_TEMPLATES, DATASET_SLOTS } from "./constants";
import { parseCsv } from "./csv/parse";
import { validateRows } from "./csv/validate";
import { templateCsv } from "./download-template";

describe("templateCsv", () => {
  it("has the column names on the first line and one example row", () => {
    const lines = templateCsv("inbound").trimEnd().split("\n");

    expect(lines).toEqual([
      "receipt_id,dock_door,sku,qty,uom,eta",
      "RCPT-10001,D-04,SKU-00042,120,EA,08:00",
    ]);
  });

  it.each(DATASET_SLOTS.map((slot) => slot.key))(
    "the %s template passes our own validation",
    (slot) => {
      const parsed = parseCsv(templateCsv(slot));

      expect(parsed.header).toEqual(DATA_TEMPLATES[slot].columns);
      expect(validateRows(slot, parsed)).toEqual([]);
    },
  );
});
