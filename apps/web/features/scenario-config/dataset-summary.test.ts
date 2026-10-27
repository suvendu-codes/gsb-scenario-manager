import { describe, expect, it } from "vitest";

import type { DatasetRecord } from "@/features/scenario-setup/types";
import { datasetSummary } from "./dataset-summary";

function record(slot: DatasetRecord["slot"], profile: DatasetRecord["profile"]): DatasetRecord {
  return {
    slot,
    fileName: `${slot}.csv`,
    source: "sample",
    sizeBytes: null,
    uploadedAt: "2026-10-01T00:00:00.000Z",
    valid: true,
    issues: [],
    profile,
  };
}

describe("datasetSummary", () => {
  it("sums the hourly units of an inbound file", () => {
    const hourly = Array.from({ length: 24 }, () => 0);
    hourly[8] = 3000;
    hourly[9] = 2335;
    expect(datasetSummary(record("inbound", { hourly }))).toBe("Inbound · 5,335 units a day");
  });

  it("shows the order lines of an outbound file", () => {
    expect(datasetSummary(record("outbound", { totalOrderlines: 17250 }))).toBe(
      "Outbound · 17,250 order lines",
    );
  });

  it("sums the on-hand units of master data", () => {
    const velocity = [
      { label: "Fast", onHand: 4000, capacity: 5000 },
      { label: "Medium", onHand: 2900, capacity: 4000 },
      { label: "Slow", onHand: 1000, capacity: 3000 },
    ];
    expect(datasetSummary(record("masterdata", { velocity }))).toBe(
      "Master data · 7,900 units on hand",
    );
  });

  it("describes a mock put file, and falls back to the name when the profile is empty", () => {
    expect(datasetSummary(record("mockput", {}))).toBe("Mockput · Mock put layout");
    expect(datasetSummary(record("inbound", {}))).toBe("Inbound");
    expect(datasetSummary(record("outbound", {}))).toBe("Outbound");
    expect(datasetSummary(record("masterdata", {}))).toBe("Master data");
  });
});
