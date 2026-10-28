import { describe, expect, it } from "vitest";

import { clockLabel, hourToPct, ruler, RUN_START_HOUR } from "./geometry";

describe("geometry", () => {
  it("places hours of the run as percentages", () => {
    expect(hourToPct(0, 8)).toBe(0);
    expect(hourToPct(2, 8)).toBe(25);
    expect(hourToPct(8, 8)).toBe(100);
    expect(hourToPct(1, 0)).toBe(0);
  });

  it("writes clock times, wrapping past midnight", () => {
    expect(clockLabel(RUN_START_HOUR)).toBe("08:00");
    expect(clockLabel(13.5)).toBe("13:30");
    expect(clockLabel(25)).toBe("01:00");
  });

  it("labels every hour and dots every quarter in between", () => {
    const { hours, dots } = ruler(8);
    expect(hours.map((h) => h.label)).toEqual([
      "0h",
      "1h",
      "2h",
      "3h",
      "4h",
      "5h",
      "6h",
      "7h",
      "8h",
    ]);
    expect(hours[4].pct).toBe(50);
    expect(dots).toHaveLength(24);
    expect(dots[0]).toBeCloseTo(3.125);
  });
});
