import { describe, expect, it } from "vitest";

import { customizedModules, isCustomized } from "./customized";

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

describe("customizedModules", () => {
  it("lists the changed modules in panel order", () => {
    expect(customizedModules(overrides)).toEqual(["wms", "station", "agent"]);
    expect(customizedModules({ "agent.botCharging": false })).toEqual(["agent"]);
    expect(customizedModules({})).toEqual([]);
  });
});
