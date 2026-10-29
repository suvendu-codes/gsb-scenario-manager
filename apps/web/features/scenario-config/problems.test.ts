import { describe, expect, it } from "vitest";

import { CONFIG_PROBLEMS, configProblem } from "./problems";

describe("configProblem", () => {
  it("builds a problem from its code, params and path", () => {
    expect(
      configProblem(
        "SCHEDULE_TOTAL_MISMATCH",
        { stationId: "PPS-1", actualHours: 6, expectedHours: 8 },
        "station.stations.PPS-1.schedule",
      ),
    ).toEqual({
      code: "SCHEDULE_TOTAL_MISMATCH",
      message: "PPS-1: the schedule adds up to 6h, but the run is 8h.",
      params: { stationId: "PPS-1", actualHours: 6, expectedHours: 8 },
      path: "station.stations.PPS-1.schedule",
    });
  });

  it("leaves out params and path when there are none", () => {
    expect(configProblem("NO_STATION_SCHEDULED", {})).toEqual({
      code: "NO_STATION_SCHEDULED",
      message: "No station is scheduled to work",
    });
  });

  it("puts the path in front of a reason for value and body errors", () => {
    expect(configProblem("INVALID_VALUE", { reason: "Too big" }, "wms.criticalPct").message).toBe(
      "wms.criticalPct: Too big",
    );
    expect(configProblem("INVALID_BODY", { reason: "Nothing to change." }).message).toBe(
      "Nothing to change.",
    );
  });

  it("gives every code a message that does not depend on parsing", () => {
    expect(Object.keys(CONFIG_PROBLEMS)).toHaveLength(new Set(Object.keys(CONFIG_PROBLEMS)).size);
    for (const code of Object.keys(CONFIG_PROBLEMS)) {
      expect(code).toMatch(/^[A-Z][A-Z0-9_]+$/);
    }
  });
});
