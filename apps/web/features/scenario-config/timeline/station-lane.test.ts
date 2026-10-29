import { describe, expect, it } from "vitest";

import type { ScheduleBlock, ScheduleBreak } from "../types";
import { breakMarks, hashString, laneSegments } from "./station-lane";

const block = (
  hours: number,
  mode: ScheduleBlock["mode"],
  breaks: ScheduleBreak[] = [],
): ScheduleBlock => ({
  hours,
  mode,
  breaks,
});
const tea = (pattern: "staggered" | "random", count = 1, durationMinutes = 15): ScheduleBreak => ({
  id: "t",
  type: "tea",
  pattern,
  durationMinutes,
  count,
});
const place = (index = 0, count = 1, id = "PPS 1") => ({ id, index, count });

describe("laneSegments", () => {
  it("lays the blocks out one after another over the run", () => {
    expect(laneSegments([block(2, "pick"), block(6, "put")], 8)).toEqual([
      { mode: "pick", from: 0, hours: 2, leftPct: 0, widthPct: 25 },
      { mode: "put", from: 2, hours: 6, leftPct: 25, widthPct: 75 },
    ]);
    expect(laneSegments([], 8)).toEqual([]);
  });
});

describe("breakMarks", () => {
  it("repeats a regular break inside its block, never on its end", () => {
    const schedule = [
      block(4, "pick", [{ id: "b", type: "break", everyHours: 2, durationHours: 0.5 }]),
      block(4, "put", [{ id: "c", type: "break", everyHours: 1.5, durationHours: 0.25 }]),
    ];
    expect(breakMarks(schedule, 8, place()).map((m) => [m.kind, m.at, m.duration])).toEqual([
      ["break", 2, 0.5],
      ["break", 5.5, 0.25],
      ["break", 7, 0.25],
    ]);
  });

  it("spreads tea breaks one per slot of the block", () => {
    const marks = breakMarks([block(8, "pick", [tea("staggered", 4)])], 8, place());
    expect(marks.map((m) => Math.floor(m.at / 2))).toEqual([0, 1, 2, 3]);
    expect(marks.every((m) => m.kind === "tea" && m.duration === 0.25)).toBe(true);
  });

  it("staggers neighbouring stations so they don't pause together", () => {
    const schedule = [block(8, "pick", [tea("staggered")])];
    const first = breakMarks(schedule, 8, place(0, 3))[0].at;
    const last = breakMarks(schedule, 8, place(2, 3))[0].at;
    expect(first).toBeCloseTo(0.775);
    expect(last).toBeCloseTo(6.975);
  });

  it("places random tea breaks by a hash, so they stay put between renders", () => {
    const schedule = [block(8, "pick", [tea("random", 2)])];
    expect(breakMarks(schedule, 8, place(0, 1, "A"))).toEqual(
      breakMarks(schedule, 8, place(0, 1, "A")),
    );
    expect(breakMarks(schedule, 8, place(0, 1, "A"))).not.toEqual(
      breakMarks(schedule, 8, place(0, 1, "B")),
    );
    expect(hashString("A")).toBe(65);
  });

  it("gives marks their place across the timeline", () => {
    const [mark] = breakMarks(
      [block(8, "pick", [{ id: "b", type: "break", everyHours: 4, durationHours: 1 }])],
      8,
      place(),
    );
    expect(mark).toMatchObject({ leftPct: 50, widthPct: 12.5 });
  });
});
