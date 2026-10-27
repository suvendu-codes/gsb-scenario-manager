import { describe, expect, it } from "vitest";

import { endHourOptions, hourLabel, startHourOptions } from "./data-window";

describe("hourLabel", () => {
  it("pads to two digits", () => {
    expect(hourLabel(0)).toBe("00:00");
    expect(hourLabel(7)).toBe("07:00");
    expect(hourLabel(24)).toBe("24:00");
  });
});

describe("window hour options", () => {
  it("lets the start run from midnight to one hour before the end", () => {
    expect(startHourOptions(24)).toHaveLength(24);
    expect(startHourOptions(24)[0]).toBe(0);
    expect(startHourOptions(24).at(-1)).toBe(23);
    expect(startHourOptions(1)).toEqual([0]);
  });

  it("lets the end run from one hour after the start to the end of the day", () => {
    expect(endHourOptions(0)[0]).toBe(1);
    expect(endHourOptions(0).at(-1)).toBe(24);
    expect(endHourOptions(23)).toEqual([24]);
  });

  it("never allows an empty window", () => {
    for (let start = 0; start < 24; start++) {
      expect(endHourOptions(start).every((end) => end > start)).toBe(true);
    }
    for (let end = 1; end <= 24; end++) {
      expect(startHourOptions(end).every((start) => start < end)).toBe(true);
    }
  });
});
