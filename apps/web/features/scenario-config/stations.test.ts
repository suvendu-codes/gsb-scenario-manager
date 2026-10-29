import { describe, expect, it } from "vitest";

import { buildDefaults } from "@/lib/mock/defaults";

import { stationsInConfig } from "./stations";
import type { MapStation } from "./upstream/stations";

const station = (id: string, registryType: string): MapStation => ({
  id,
  label: id,
  registryType,
  allowedModes: ["pick"],
  status: "connected",
  systems: ["rtp"],
  location: null,
  pickDirection: null,
  frontPositions: 1,
  queueLength: null,
  rollcageDocks: null,
  registryUrl: null,
  registryVersion: "2",
});

describe("stationsInConfig", () => {
  const config = buildDefaults([
    { id: "2", allowedModes: ["pick"] },
    { id: "1", allowedModes: ["put"] },
  ]);

  it("lists the config's stations in its order, described by the lookup", () => {
    const listed = stationsInConfig(config, [station("1", "manual"), station("2", "ppp_manual")]);
    expect(listed.map((s) => [s.id, s.registryType])).toEqual([
      ["1", "manual"],
      ["2", "ppp_manual"],
    ]);
  });

  it("still lists a station the lookup lacks, and leaves out one the config lacks", () => {
    const listed = stationsInConfig(config, [station("2", "manual"), station("9", "manual")]);
    expect(listed.map((s) => [s.id, s.registryType])).toEqual([
      ["1", "unknown"],
      ["2", "manual"],
    ]);
  });

  it("lists every station with unknown details while the lookup loads", () => {
    expect(stationsInConfig(config, []).map((s) => s.label)).toEqual(["1", "2"]);
  });
});
