import { describe, expect, it } from "vitest";

import { buildDefaults } from "@/lib/mock/defaults";
import { resolveConfig } from "../paths";
import { applyPatchToOverrides, diffToPatch, inversePatch, leafEntries } from "./changes";

const defaults = buildDefaults();

describe("leafEntries", () => {
  it("flattens objects and keeps arrays and null as single leaves", () => {
    expect(leafEntries({ a: { b: 1, c: [1, 2] }, d: null })).toEqual([
      ["a.b", 1],
      ["a.c", [1, 2]],
      ["d", null],
    ]);
  });

  it("lists every leaf of a config with a station's schedule as one entry", () => {
    const paths = leafEntries(defaults).map(([path]) => path);
    expect(paths).toContain("station.stations.PPS-101.schedule");
    expect(paths).not.toContain("station.stations.PPS-101.schedule.0.hours");
  });
});

describe("diffToPatch", () => {
  it("returns null when nothing changed", () => {
    expect(diffToPatch(defaults, structuredClone(defaults))).toBeNull();
  });

  it("sets only the leaves that differ", () => {
    const next = structuredClone(defaults);
    next.wms.volumeMultiplier = 2;
    next.agent.fleet.htm = 12;
    next.station.stations["PPS-102"].schedule = [{ hours: 8, mode: "put", breaks: [] }];

    expect(diffToPatch(defaults, next)).toEqual({
      set: {
        "wms.volumeMultiplier": 2,
        "station.stations.PPS-102.schedule": [{ hours: 8, mode: "put", breaks: [] }],
        "agent.fleet.htm": 12,
      },
    });
  });
});

describe("applyPatchToOverrides", () => {
  it("sets values and keeps the others", () => {
    const result = applyPatchToOverrides(
      defaults,
      { "agent.fleet.htm": 12 },
      { set: { "wms.volumeMultiplier": 2 } },
    );
    expect(result).toEqual({ "agent.fleet.htm": 12, "wms.volumeMultiplier": 2 });
  });

  it("drops an override that goes back to its default", () => {
    const result = applyPatchToOverrides(
      defaults,
      { "wms.volumeMultiplier": 2 },
      { set: { "wms.volumeMultiplier": 1 } },
    );
    expect(result).toEqual({});
  });

  it("resets a path or everything under a prefix, before it sets", () => {
    const before = { "wms.volumeMultiplier": 2, "wms.criticalPct": 20, "agent.fleet.htm": 12 };
    expect(applyPatchToOverrides(defaults, before, { reset: ["wms"] })).toEqual({
      "agent.fleet.htm": 12,
    });
    expect(
      applyPatchToOverrides(defaults, before, { reset: ["wms"], set: { "wms.cutoffHour": 10 } }),
    ).toEqual({ "agent.fleet.htm": 12, "wms.cutoffHour": 10 });
  });

  it("orders lists the way the server does", () => {
    const result = applyPatchToOverrides(
      defaults,
      {},
      {
        set: {
          "wms.orderTypes": ["outbound", "inbound"],
        },
      },
    );
    // Reordered, the order types equal their default, so they are not kept as a change.
    expect(result).not.toHaveProperty(["wms.orderTypes"]);
  });

  it("does not change its inputs", () => {
    const before = { "agent.fleet.htm": 12 };
    applyPatchToOverrides(defaults, before, { set: { "wms.criticalPct": 20 }, reset: ["agent"] });
    expect(before).toEqual({ "agent.fleet.htm": 12 });
  });
});

describe("inversePatch", () => {
  const before = { "wms.volumeMultiplier": 2, "wms.criticalPct": 20, "agent.fleet.htm": 12 };

  it("restores the previous override, or resets a path that had none", () => {
    const patch = { set: { "wms.volumeMultiplier": 3, "wms.cutoffHour": 10 } };
    expect(inversePatch(before, patch)).toEqual({
      set: { "wms.volumeMultiplier": 2 },
      reset: ["wms.cutoffHour"],
    });
  });

  it("restores everything a reset removed", () => {
    expect(inversePatch(before, { reset: ["wms"] })).toEqual({
      set: { "wms.volumeMultiplier": 2, "wms.criticalPct": 20 },
    });
  });

  it("applying the inverse brings the overrides back", () => {
    const patches = [
      { set: { "wms.volumeMultiplier": 3, "wms.cutoffHour": 10 } },
      { reset: ["wms"] },
      { reset: ["agent"], set: { "agent.botCharging": false } },
      { set: { "wms.volumeMultiplier": 1 } },
    ];
    for (const patch of patches) {
      const after = applyPatchToOverrides(defaults, before, patch);
      const restored = applyPatchToOverrides(defaults, after, inversePatch(before, patch));
      expect(restored).toEqual(before);
    }
  });

  it("produces a config equal to the original after an undo", () => {
    const patch = { set: { "wms.volumeMultiplier": 3 } };
    const after = applyPatchToOverrides(defaults, before, patch);
    const restored = applyPatchToOverrides(defaults, after, inversePatch(before, patch));
    expect(resolveConfig(defaults, restored)).toEqual(resolveConfig(defaults, before));
  });
});
