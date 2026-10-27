import { describe, expect, it } from "vitest";

import designSample from "@/lib/mock/data/pps/design-sample.json";
import registryV2Large from "@/lib/mock/data/pps/registry-v2-49.json";
import registryV2Small from "@/lib/mock/data/pps/registry-v2-5.json";
import registryV3 from "@/lib/mock/data/pps/registry-v3-17.json";

import { fromUpstreamPps, type MapStations } from "./stations";

/** Reads a body that must have a station list. */
function read(body: unknown): MapStations {
  const result = fromUpstreamPps(body);
  if (!result) throw new Error("expected a station list");
  return result;
}

const pick = <K extends keyof MapStations["stations"][number]>(result: MapStations, key: K) =>
  result.stations.map((station) => station[key]);

describe("fromUpstreamPps: registry version 2 (5-station sample)", () => {
  const result = read(registryV2Small);

  it("reads every station, with string ids and labels", () => {
    expect(result.skipped).toEqual([]);
    expect(pick(result, "id")).toEqual(["1", "2", "3", "4", "5"]);
    expect(pick(result, "label")).toEqual(["PPS 1", "PPS 2", "PPS 3", "PPS 4", "PPS 5"]);
  });

  it("reads the fields the registry gives", () => {
    expect(result.stations[0]).toEqual({
      id: "1",
      label: "PPS 1",
      registryType: "ppp_manual",
      allowedModes: ["put"],
      status: "disconnected",
      systems: ["rtp"],
      location: "2181500276",
      pickDirection: 2,
      frontPositions: 1,
      queueLength: 5,
      rollcageDocks: 0,
      registryUrl: "http://localhost:3000/pps/1/api/",
      registryVersion: "2",
    });
  });

  it("counts queue barcodes and roll cage docks per station", () => {
    expect(pick(result, "queueLength")).toEqual([5, 5, 5, 10, 9]);
    expect(pick(result, "rollcageDocks")).toEqual([0, 0, 0, 4, 4]);
    expect(pick(result, "registryType")).toEqual([
      "ppp_manual",
      "ppp_manual",
      "ppp_manual",
      "manual",
      "manual",
    ]);
  });
});

describe("fromUpstreamPps: registry version 2 (49 stations)", () => {
  const result = read(registryV2Large);

  it("reads all 49 stations", () => {
    expect(result.skipped).toEqual([]);
    expect(result.stations).toHaveLength(49);
  });

  it("keeps each station's single allowed mode", () => {
    const count = (mode: string) =>
      result.stations.filter((s) => s.allowedModes.join() === mode).length;
    expect([count("pick"), count("put"), count("audit")]).toEqual([28, 14, 7]);
  });

  it("reads systems as lists, including stations that serve two", () => {
    expect(result.stations.filter((s) => s.systems.join() === "rtp,ttp")).toHaveLength(6);
  });

  it("reports a station without pps_points as having none", () => {
    expect(result.stations.filter((s) => s.frontPositions === 0)).toHaveLength(11);
  });
});

describe("fromUpstreamPps: registry version 3", () => {
  const result = read(registryV3);

  it("reads all 17 stations", () => {
    expect(result.skipped).toEqual([]);
    expect(pick(result, "id").at(-1)).toBe("101");
    expect(result.stations).toHaveLength(17);
  });

  it("puts allowed modes in the usual order whatever order they come in", () => {
    expect(result.stations[1].allowedModes).toEqual(["pick", "put", "audit"]);
  });

  it("reads systems, location and pick direction from their version 3 places", () => {
    expect(result.stations[0]).toMatchObject({
      registryType: "manual",
      systems: ["relay"],
      location: "6,7",
      pickDirection: 1,
      frontPositions: 1,
      registryVersion: "3",
    });
  });

  it("leaves what version 3 does not say as unknown", () => {
    expect(result.stations[0]).toMatchObject({ queueLength: null, rollcageDocks: null });
  });

  it("keeps the new station types as given", () => {
    expect(new Set(pick(result, "registryType"))).toEqual(
      new Set(["manual", "tote_extraction", "auto_tote_induction"]),
    );
  });
});

describe("fromUpstreamPps: the API design's sample", () => {
  const result = read(designSample);

  it("reads the wrapper and the design's station shape", () => {
    expect(result.mapId).toBe("<map_id>");
    expect(pick(result, "id")).toEqual(["PPS-101", "PPS-105"]);
    expect(pick(result, "label")).toEqual(["PPS-101", "PPS-105"]);
    expect(result.stations[0]).toMatchObject({
      registryType: "Standard PPS",
      allowedModes: ["pick", "put"],
      systems: ["rtp"],
      location: "A-01.2",
      pickDirection: 0,
      status: "connected",
      frontPositions: null,
    });
  });
});

describe("fromUpstreamPps: tolerance", () => {
  const station = { pps_id: 7, type: "manual", allowed_modes: ["pick"] };

  it("accepts a bare list and a wrapper with a map version", () => {
    expect(read([station]).stations).toHaveLength(1);
    expect(read({ map_id: "m", map_version: 12, pps: [station] })).toMatchObject({
      mapId: "m",
      mapVersion: "12",
    });
  });

  it("ignores fields and modes it does not know", () => {
    const result = read([{ ...station, allowed_modes: ["pick", "sort"], new_field: { a: 1 } }]);
    expect(result.stations[0].allowedModes).toEqual(["pick"]);
    expect(result.stations[0]).not.toHaveProperty("new_field");
  });

  it("skips records it cannot use and says why, keeping the rest", () => {
    const result = read([
      station,
      { type: "manual" },
      { pps_id: "A.1" },
      { pps_id: "7" },
      "text",
      { pps_id: 8 },
    ]);
    expect(pick(result, "id")).toEqual(["7", "8"]);
    expect(result.skipped).toEqual([
      { index: 1, reason: "no pps_id" },
      { index: 2, reason: 'pps_id "A.1" contains a dot' },
      { index: 3, reason: 'pps_id "7" repeated' },
      { index: 4, reason: "not an object" },
    ]);
  });

  it("fills unknowns for a record with only an id", () => {
    expect(read([{ pps_id: 9 }]).stations[0]).toMatchObject({
      registryType: "unknown",
      allowedModes: [],
      status: "unknown",
      systems: [],
      location: null,
      registryUrl: null,
    });
  });

  it("returns null when there is no station list", () => {
    expect(fromUpstreamPps({ map_id: "m" })).toBeNull();
    expect(fromUpstreamPps("text")).toBeNull();
    expect(fromUpstreamPps(null)).toBeNull();
  });
});
