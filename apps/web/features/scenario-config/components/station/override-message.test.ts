import { describe, expect, it } from "vitest";

import { allStationsNotice, listStations, stationNotice } from "./override-message";

describe("listStations", () => {
  it("joins ids the way a sentence does", () => {
    expect(listStations([])).toBe("");
    expect(listStations(["PPS-101"])).toBe("PPS-101");
    expect(listStations(["PPS-101", "PPS-102"])).toBe("PPS-101 and PPS-102");
    expect(listStations(["PPS-101", "PPS-102", "PPS-103"])).toBe("PPS-101, PPS-102 and PPS-103");
  });
});

describe("allStationsNotice", () => {
  it("says nothing when no station keeps its own value", () => {
    expect(allStationsNotice("schedule", [])).toBeNull();
  });

  it("names the stations and says how to include them again", () => {
    expect(allStationsNotice("schedule", ["PPS-101", "PPS-102"])).toBe(
      "PPS-101 and PPS-102 keep their own schedules, so changes here skip them. Open those stations and use the shared schedule to include them again.",
    );
  });

  it("uses the singular for one station", () => {
    expect(allStationsNotice("structure", ["PPS-103"])).toBe(
      "PPS-103 keeps its own structure, so changes here skip it. Open that station and use the shared structure to include it again.",
    );
  });
});

describe("stationNotice", () => {
  it("tells the station it is skipped by All-stations edits", () => {
    expect(stationNotice("schedule")).toBe(
      "This station keeps its own schedule. Changes made for all stations skip it.",
    );
  });
});
