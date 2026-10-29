import { describe, expect, it } from "vitest";

import { buildDefaults } from "@/lib/mock/defaults";
import { deepEqual, getAtPath, hasPath, isLeafPath, resolveConfig, splitPath } from "./paths";

describe("splitPath", () => {
  it("splits on dots", () => {
    expect(splitPath("wms.release.waves")).toEqual(["wms", "release", "waves"]);
  });

  it("rejects empty and unsafe segments", () => {
    expect(splitPath("")).toBeNull();
    expect(splitPath("wms..waves")).toBeNull();
    expect(splitPath(".wms")).toBeNull();
    expect(splitPath("wms.__proto__.x")).toBeNull();
    expect(splitPath("constructor.prototype")).toBeNull();
  });
});

describe("getAtPath, hasPath and isLeafPath", () => {
  const defaults = buildDefaults();

  it("reads nested values and arrays", () => {
    expect(getAtPath(defaults, "wms.release.waves")).toBe(4);
    expect(getAtPath(defaults, "wms.orderTypes")).toEqual(["inbound", "outbound"]);
  });

  it("returns undefined for a missing path", () => {
    expect(getAtPath(defaults, "wms.nope")).toBeUndefined();
    expect(getAtPath(defaults, "wms.release.waves.deeper")).toBeUndefined();
  });

  it("counts a null value as existing", () => {
    const path = "station.stations.PPS-101.operations.put.behavior";
    expect(hasPath(defaults, `${path}.front`)).toBe(true);
    const withNull = { a: { b: null } };
    expect(hasPath(withNull, "a.b")).toBe(true);
    expect(isLeafPath(withNull, "a.b")).toBe(true);
  });

  it("treats a group of values as not a leaf", () => {
    expect(isLeafPath(defaults, "wms.release")).toBe(false);
    expect(isLeafPath(defaults, "wms.release.waves")).toBe(true);
    expect(isLeafPath(defaults, "station.stations.PPS-101.schedule")).toBe(true);
    expect(isLeafPath(defaults, "nope")).toBe(false);
  });
});

describe("deepEqual", () => {
  it("compares objects by key and arrays in order", () => {
    expect(deepEqual({ a: [1, 2] }, { a: [1, 2] })).toBe(true);
    expect(deepEqual({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(deepEqual([], {})).toBe(false);
    expect(deepEqual(null, null)).toBe(true);
  });
});

describe("resolveConfig", () => {
  it("returns the defaults when there are no overrides", () => {
    const defaults = buildDefaults();
    expect(resolveConfig(defaults, {})).toEqual(defaults);
  });

  it("applies overrides on top of the defaults without changing the inputs", () => {
    const defaults = buildDefaults();
    const overrides = { "wms.volumeMultiplier": 2.25, "agent.fleet.htm": 12 };

    const resolved = resolveConfig(defaults, overrides);

    expect(resolved.wms.volumeMultiplier).toBe(2.25);
    expect(resolved.agent.fleet.htm).toBe(12);
    expect(resolved.agent.fleet.vtm).toBe(10);
    expect(defaults.wms.volumeMultiplier).toBe(1);
    expect(overrides).toEqual({ "wms.volumeMultiplier": 2.25, "agent.fleet.htm": 12 });
  });

  it("replaces an array whole", () => {
    const resolved = resolveConfig(buildDefaults(), { "wms.orderTypes": ["audit"] });
    expect(resolved.wms.orderTypes).toEqual(["audit"]);
  });

  it("ignores unknown paths and paths that point at a group", () => {
    const defaults = buildDefaults();
    const resolved = resolveConfig(defaults, {
      "wms.nope": 1,
      "wms.release": { pattern: "streaming", waves: 1 },
      "constructor.prototype.x": 1,
    });
    expect(resolved).toEqual(defaults);
  });

  it("does not share objects with the overrides", () => {
    const blocks = [{ hours: 8, mode: "pick", breaks: [] }];
    const resolved = resolveConfig(buildDefaults(), {
      "station.stations.PPS-101.schedule": blocks,
    });
    blocks[0].hours = 1;
    expect(resolved.station.stations["PPS-101"].schedule[0].hours).toBe(8);
  });
});
