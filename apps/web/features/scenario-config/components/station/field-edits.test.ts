import { describe, expect, it } from "vitest";

import { buildDefaults } from "@/lib/mock/defaults";
import {
  copySchedule,
  updateStations,
  writeGroupStructure,
  writeStationStructure,
} from "../../state/station-edits";
import { isStationCustomized, resetStation, structureKeyOf } from "./field-edits";

const ALL = ["PPS-101", "PPS-102", "PPS-103", "PPS-104", "PPS-105", "PPS-106"];

describe("structureKeyOf", () => {
  it("reads the key from a station structure path", () => {
    expect(structureKeyOf("station.stations.PPS-101.structure.backOperator")).toBe("backOperator");
    expect(structureKeyOf("station.stations.PPS-106.structure.staffedBackSeats")).toBe(
      "staffedBackSeats",
    );
  });

  it("returns null for any other path", () => {
    expect(structureKeyOf("station.stations.PPS-101.schedule")).toBeNull();
    expect(structureKeyOf("station.stations.PPS-101.setup.queueLimit")).toBeNull();
    expect(structureKeyOf("station.global.timeInErrorPct")).toBeNull();
    expect(structureKeyOf("station.stations.PPS-101.structure")).toBeNull();
    expect(structureKeyOf("station.stations.PPS-101.structure.a.b")).toBeNull();
  });
});

describe("resetStation", () => {
  const defaults = buildDefaults();

  it("puts one station back to its defaults", () => {
    const config = updateStations(defaults, ["PPS-102"], (station) => ({
      ...station,
      schedule: [],
      structure: { ...station.structure, backOperator: "shuttle" },
    }));

    const reset = resetStation(config, defaults, "PPS-102");

    expect(reset.station.stations["PPS-102"]).toEqual(defaults.station.stations["PPS-102"]);
  });

  it("leaves the other stations alone", () => {
    const config = writeGroupStructure(defaults, ALL, { backOperator: "shuttle" });
    const reset = resetStation(config, defaults, "PPS-101");
    expect(reset.station.stations["PPS-101"].structure.backOperator).toBe("manual");
    expect(reset.station.stations["PPS-102"].structure.backOperator).toBe("shuttle");
  });
});

describe("isStationCustomized", () => {
  const defaults = buildDefaults();

  it("is true for changed settings, or a schedule or structure that differs from its group", () => {
    expect(isStationCustomized(defaults, {}, "PPS-101", ["PPS-101"])).toBe(false);
    expect(
      isStationCustomized(
        defaults,
        { "station.stations.PPS-101.structure.backOperator": "shuttle" },
        "PPS-101",
        ["PPS-101"],
      ),
    ).toBe(true);

    // Same schedule everywhere, so only the structure of PPS-103 differs from its group.
    const shared = copySchedule(defaults, "PPS-101", ALL);
    const own = writeStationStructure(shared, "PPS-103", { frontOperation: "dual" });
    expect(isStationCustomized(own, {}, "PPS-103", ALL)).toBe(true);
    expect(isStationCustomized(own, {}, "PPS-104", ALL)).toBe(false);
    expect(isStationCustomized(own, {}, "PPS-103", ["PPS-103"])).toBe(false);
  });
});
