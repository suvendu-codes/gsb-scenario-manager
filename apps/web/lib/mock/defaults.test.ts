import { describe, expect, it } from "vitest";

import { configValuesSchema } from "@/features/scenario-config/schema";
import { validateConfig } from "@/features/scenario-config/validation";

import { MAP_FIXTURES } from "./data";
import { buildDefaults, DEFAULT_RUN_DURATION_HOURS, defaultsForMap } from "./defaults";

describe("defaultsForMap", () => {
  it.each(Object.keys(MAP_FIXTURES))("builds valid defaults for %s", (mapId) => {
    const defaults = defaultsForMap(mapId);
    expect(configValuesSchema.safeParse(defaults).success).toBe(true);
    expect(validateConfig(defaults, DEFAULT_RUN_DURATION_HOURS)).toEqual([]);
  });

  it("has one station per registry station, keyed by its pps_id", () => {
    expect(Object.keys(defaultsForMap("multi-msio").station.stations)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    expect(Object.keys(defaultsForMap("ecom-rtp").station.stations)).toHaveLength(49);
    expect(Object.keys(defaultsForMap("case-pick").station.stations)).toEqual([
      "PPS-101",
      "PPS-105",
    ]);
  });

  it("takes the fleet counts from the sizer", () => {
    expect(defaultsForMap("ecom-rtp").agent.fleet).toEqual({ htm: 40, vtm: 12 });
    expect(defaultsForMap("relay-coexist").agent.fleet).toEqual({ htm: 24, vtm: 8 });
  });

  it("schedules each station only in the modes it allows", () => {
    const stations = defaultsForMap("relay-coexist").station.stations;
    expect(stations["1"].schedule.map((b) => [b.mode, b.hours])).toEqual([
      ["pick", 4],
      ["put", 4],
    ]);
    expect(stations["12"].schedule.map((b) => [b.mode, b.hours])).toEqual([["pick", 8]]);
    expect(stations["101"].schedule.map((b) => [b.mode, b.hours])).toEqual([["put", 8]]);
  });

  it("has no stations or bots for a map without fixtures", () => {
    const defaults = defaultsForMap("no-such-map");
    expect(defaults.station.stations).toEqual({});
    expect(defaults.agent.fleet).toEqual({ htm: 0, vtm: 0 });
  });
});

describe("buildDefaults", () => {
  it("leaves a station that allows no mode unassigned (no blocks)", () => {
    const defaults = buildDefaults([{ id: "7", allowedModes: [] }], []);
    expect(defaults.station.stations["7"].schedule).toEqual([]);
  });

  it("gives blocks the design's default regular breaks, when they fit", () => {
    const stations = buildDefaults([{ id: "7", allowedModes: ["pick", "put"] }], []).station
      .stations;
    expect(stations["7"].schedule.map((b) => b.breaks)).toEqual([
      [{ id: "b1", type: "break", everyHours: 2.5, durationHours: 0.5 }],
      [{ id: "b2", type: "break", everyHours: 2, durationHours: 0.5 }],
    ]);
  });
});
