import { describe, expect, it } from "vitest";

import { buildDefaults } from "@/lib/mock/defaults";
import {
  markStationOverride,
  updateStations,
  writeSharedStructure,
} from "../../state/station-edits";
import { isStationCustomized, resetStation, structureKeyOf } from "./field-edits";

describe("structureKeyOf", () => {
  it("reads the key from a station structure path", () => {
    expect(structureKeyOf("station.stations.PPS-101.structure.backOperator")).toBe("backOperator");
    expect(structureKeyOf("station.stations.PPS-106.structure.staffedBackSeats")).toBe(
      "staffedBackSeats",
    );
  });

  it("returns null for any other path", () => {
    expect(structureKeyOf("station.stations.PPS-101.schedule")).toBeNull();
    expect(structureKeyOf("station.stations.PPS-101.hardware.loopSpeed")).toBeNull();
    expect(structureKeyOf("station.global.timeInErrorPct")).toBeNull();
    expect(structureKeyOf("station.stations.PPS-101.structure")).toBeNull();
    expect(structureKeyOf("station.stations.PPS-101.structure.a.b")).toBeNull();
  });
});

describe("resetStation", () => {
  const defaults = buildDefaults();

  it("puts one station back to its defaults and lets it follow All-stations edits again", () => {
    let config = updateStations(defaults, ["PPS-102"], (station) => ({
      ...station,
      structure: { ...station.structure, backOperator: "shuttle" },
      hardware: { ...station.hardware, loopSpeed: 90 },
    }));
    config = markStationOverride(
      markStationOverride(config, "schedule", "PPS-102"),
      "structure",
      "PPS-102",
    );

    const reset = resetStation(config, defaults, "PPS-102");

    expect(reset.station.stations["PPS-102"]).toEqual(defaults.station.stations["PPS-102"]);
    expect(reset.station.override).toEqual({ schedule: [], structure: [] });
  });

  it("leaves the other stations alone", () => {
    const config = writeSharedStructure(defaults, { backOperator: "shuttle" });
    const reset = resetStation(config, defaults, "PPS-101");
    expect(reset.station.stations["PPS-101"].structure.backOperator).toBe("manual");
    expect(reset.station.stations["PPS-102"].structure.backOperator).toBe("shuttle");
  });
});

describe("isStationCustomized", () => {
  const defaults = buildDefaults();

  it("is true for changed settings or a kept-own schedule or structure", () => {
    expect(isStationCustomized(defaults, {}, "PPS-101")).toBe(false);
    expect(
      isStationCustomized(
        defaults,
        { "station.stations.PPS-101.hardware.loopSpeed": 90 },
        "PPS-101",
      ),
    ).toBe(true);
    expect(
      isStationCustomized(
        defaults,
        { "station.stations.PPS-101.hardware.loopSpeed": 90 },
        "PPS-102",
      ),
    ).toBe(false);

    const marked = markStationOverride(defaults, "structure", "PPS-103");
    expect(isStationCustomized(marked, {}, "PPS-103")).toBe(true);
    expect(isStationCustomized(marked, {}, "PPS-104")).toBe(false);
  });
});
