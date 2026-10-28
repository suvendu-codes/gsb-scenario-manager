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
