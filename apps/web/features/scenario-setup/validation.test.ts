import { describe, expect, it } from "vitest";

import { analyzeCsv } from "./csv/analyze";
import type { DatasetRecord, DatasetSlot, ScenarioDatasets } from "./types";
import { hasRequiredDatasets, validateScenarioDatasets } from "./validation";

function record(slot: DatasetSlot, issues: string[] = []): DatasetRecord {
  return {
    slot,
    fileName: `${slot}.csv`,
    source: "sample",
    sizeBytes: null,
    uploadedAt: "2026-10-15T10:00:00.000Z",
    valid: issues.length === 0,
    issues,
    profile: {},
  };
}

function datasets(overrides: Partial<ScenarioDatasets> = {}): ScenarioDatasets {
  return { inbound: null, outbound: null, masterdata: null, mockput: null, ...overrides };
}

const required = {
  inbound: record("inbound"),
  outbound: record("outbound"),
  masterdata: record("masterdata"),
};

describe("hasRequiredDatasets", () => {
  it("is true when inbound, outbound and master data are present, with or without mock put", () => {
    expect(hasRequiredDatasets(datasets(required))).toBe(true);
    expect(hasRequiredDatasets(datasets({ ...required, mockput: record("mockput") }))).toBe(true);
  });

  it("is false when any required dataset is missing", () => {
    expect(hasRequiredDatasets(datasets({ ...required, outbound: null }))).toBe(false);
    expect(hasRequiredDatasets(datasets({ mockput: record("mockput") }))).toBe(false);
  });
});

describe("validateScenarioDatasets", () => {
  it("passes when everything is present and clean", () => {
    expect(validateScenarioDatasets(datasets(required), {})).toEqual({
      issues: {},
      issueCount: 0,
      fileCount: 0,
      passed: true,
    });
  });

  it("does not pass while a required dataset is missing", () => {
    const result = validateScenarioDatasets(datasets({ ...required, masterdata: null }), {});

    expect(result.passed).toBe(false);
    expect(result.issueCount).toBe(0);
  });

  it("collects the problems of each file and counts them", () => {
    const result = validateScenarioDatasets(
      datasets({
        ...required,
        inbound: record("inbound", ["a", "b"]),
        masterdata: record("masterdata", ["c"]),
      }),
      {},
    );

    expect(result.issues).toEqual({ inbound: ["a", "b"], masterdata: ["c"] });
    expect(result.issueCount).toBe(3);
    expect(result.fileCount).toBe(2);
    expect(result.passed).toBe(false);
  });

  it("flags an optional file's problems too", () => {
    const result = validateScenarioDatasets(
      datasets({ ...required, mockput: record("mockput", ["bad zone"]) }),
      {},
    );

    expect(result.issues.mockput).toEqual(["bad zone"]);
    expect(result.passed).toBe(false);
  });
});

describe("validateScenarioDatasets: cross-file SKU check", () => {
  const upload = (slot: DatasetSlot, text: string) =>
    analyzeCsv(slot, `${slot}.csv`, text.length, text, new Date("2026-10-15T10:00:00.000Z"));

  const master = upload(
    "masterdata",
    "sku,bin_location,velocity_class,on_hand,capacity,bin_tag\nSKU-1,A,Fast,1,2,x",
  );
  const inboundHeader = "receipt_id,dock_door,sku,qty,uom,eta";

  it("reports inbound SKUs missing from the master data file", () => {
    const inbound = upload(
      "inbound",
      `${inboundHeader}\nR1,D,SKU-1,5,EA,08:00\nR2,D,SKU-9,5,EA,09:00`,
    );

    const result = validateScenarioDatasets(
      datasets({
        inbound: inbound.record,
        outbound: record("outbound"),
        masterdata: master.record,
      }),
      { inbound, masterdata: master },
    );

    expect(result.issues.inbound).toEqual(["row 3: SKU-9 is not present in the master data file"]);
    expect(result.passed).toBe(false);
  });

  it("passes when every SKU is in the master data file", () => {
    const inbound = upload("inbound", `${inboundHeader}\nR1,D,SKU-1,5,EA,08:00`);

    const result = validateScenarioDatasets(
      datasets({
        inbound: inbound.record,
        outbound: record("outbound"),
        masterdata: master.record,
      }),
      { inbound, masterdata: master },
    );

    expect(result.passed).toBe(true);
  });

  it("skips the check when the master data was not uploaded in this session", () => {
    const inbound = upload("inbound", `${inboundHeader}\nR1,D,SKU-9,5,EA,09:00`);

    const result = validateScenarioDatasets(
      datasets({
        inbound: inbound.record,
        outbound: record("outbound"),
        masterdata: record("masterdata"),
      }),
      { inbound },
    );

    expect(result.passed).toBe(true);
  });
});
