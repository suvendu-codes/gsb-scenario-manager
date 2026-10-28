import { describe, expect, it } from "vitest";

import { listStations, stationNotice, typeNotice } from "./override-message";

describe("listStations", () => {
  it("joins names the way a sentence does", () => {
    expect(listStations([])).toBe("");
    expect(listStations(["PPS 1"])).toBe("PPS 1");
    expect(listStations(["PPS 1", "PPS 2"])).toBe("PPS 1 and PPS 2");
    expect(listStations(["PPS 1", "PPS 2", "PPS 3"])).toBe("PPS 1, PPS 2 and PPS 3");
  });
});

describe("typeNotice", () => {
  it("says nothing when no station keeps its own value", () => {
    expect(typeNotice("schedule", [])).toBeNull();
  });

  it("names the stations and says how to include them again", () => {
    expect(typeNotice("schedule", ["PPS 1", "PPS 2"])).toBe(
      "PPS 1 and PPS 2 keep their own schedules, so changes here skip them. Open them and use the type’s schedule to include them again.",
    );
  });

  it("uses the singular for one station", () => {
    expect(typeNotice("structure", ["PPS 3"])).toBe(
      "PPS 3 keeps its own structure, so changes here skip it. Open it and use the type’s structure to include it again.",
    );
  });
});

describe("stationNotice", () => {
  it("tells the station that type edits skip it", () => {
    expect(stationNotice("schedule", "Manual")).toBe(
      "This station keeps its own schedule: it differs from most Manual stations, so changes made for the type skip it.",
    );
  });
});
