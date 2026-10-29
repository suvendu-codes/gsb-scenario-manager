import { describe, expect, it } from "vitest";

import type { MapStation } from "../../upstream/stations";
import { allowedModesFor } from "./allowed-modes";

const station = (id: string, allowedModes: MapStation["allowedModes"], registryType = "manual") =>
  ({ id, label: id, registryType, allowedModes }) as MapStation;

describe("allowedModesFor", () => {
  const stations = [
    station("1", ["pick", "put"]),
    station("2", ["put", "audit"]),
    station("3", [], "unknown"),
  ];

  it("is the station's own modes for one station", () => {
    expect(allowedModesFor(stations, ["1"])).toEqual(["pick", "put"]);
  });

  it("is the modes every station allows for several", () => {
    expect(allowedModesFor(stations, ["1", "2"])).toEqual(["put"]);
  });

  it("does not limit a station the registry does not describe", () => {
    expect(allowedModesFor(stations, ["3"])).toEqual(["pick", "put", "audit"]);
    expect(allowedModesFor(stations, ["9"])).toEqual(["pick", "put", "audit"]);
  });
});

describe("effectiveAllowedModes: the editor and the server agree", () => {
  it("allows every mode for a station the registry doesn't describe, and nothing else", async () => {
    const { effectiveAllowedModes } = await import("../../upstream/stations");
    expect(effectiveAllowedModes(undefined)).toEqual(["pick", "put", "audit"]);
    expect(effectiveAllowedModes(station("x", [], "unknown"))).toEqual(["pick", "put", "audit"]);
    expect(effectiveAllowedModes(station("y", []))).toEqual([]);
  });

  it("gives the same modes on both sides for every station of every mock map", async () => {
    const { MAP_FIXTURES } = await import("@/lib/mock/data");
    const { allowedModesForMap } = await import("@/lib/mock/defaults");
    const { fromUpstreamPps } = await import("../../upstream/stations");
    for (const [mapId, fixture] of Object.entries(MAP_FIXTURES)) {
      const stations = fromUpstreamPps(fixture.pps)?.stations ?? [];
      const server = allowedModesForMap(mapId);
      for (const s of stations)
        expect(allowedModesFor(stations, [s.id]), `${mapId} ${s.id}`).toEqual(server[s.id]);
    }
  });
});
