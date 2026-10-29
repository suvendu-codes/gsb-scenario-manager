import { describe, expect, it } from "vitest";

import { isCustomized } from "./customized";

const overrides = {
  "wms.volumeMultiplier": 2,
  "station.stations.PPS-101.structure.frontOperation": "dual",
  "agent.fleet.htm": 12,
};

describe("isCustomized", () => {
  it("is true for a changed path and for any prefix of it", () => {
    expect(isCustomized(overrides, "wms.volumeMultiplier")).toBe(true);
    expect(isCustomized(overrides, "wms")).toBe(true);
    expect(isCustomized(overrides, "station.stations.PPS-101")).toBe(true);
  });

  it("is false for paths with no change, and does not match part of a name", () => {
    expect(isCustomized(overrides, "wms.criticalPct")).toBe(false);
    expect(isCustomized(overrides, "station.stations.PPS-10")).toBe(false);
    expect(isCustomized(overrides, "wm")).toBe(false);
    expect(isCustomized({}, "wms")).toBe(false);
  });
});
