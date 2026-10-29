import { describe, expect, it } from "vitest";

import type { ScheduleBlock } from "../types";
import type { BreakMark } from "./station-lane";
import { typeBreakMarks, typeSegments } from "./type-lane";

const block = (hours: number, mode: ScheduleBlock["mode"]): ScheduleBlock => ({
  hours,
  mode,
  breaks: [],
});
const modes = (segments: ReturnType<typeof typeSegments>) =>
  segments.map((s) => [s.mode, s.from, s.from + s.hours]);

describe("typeSegments", () => {
  it("is the shared schedule when every station has it", () => {
    const shared = [block(4, "pick"), block(4, "put")];
    expect(modes(typeSegments([shared, shared], 8))).toEqual([
      ["pick", 0, 4],
      ["put", 4, 8],
    ]);
  });

  it("marks where stations with the same modes switch at different times", () => {
    const segments = typeSegments(
      [
        [block(3, "pick"), block(5, "put")],
        [block(5, "pick"), block(3, "put")],
      ],
      8,
    );
    expect(modes(segments)).toEqual([
      ["pick", 0, 3],
      ["mixed", 3, 5],
      ["put", 5, 8],
    ]);
  });

  it("is one mixed span when the stations run different modes", () => {
    expect(modes(typeSegments([[block(8, "pick")], [block(8, "put")]], 8))).toEqual([
      ["mixed", 0, 8],
    ]);
    expect(modes(typeSegments([[block(8, "pick")], []], 8))).toEqual([["mixed", 0, 8]]);
  });

  it("draws nothing for a type with no blocks", () => {
    expect(typeSegments([[], []], 8)).toEqual([]);
    expect(typeSegments([], 8)).toEqual([]);
  });
});

describe("typeBreakMarks", () => {
  const mark = (at: number, kind: BreakMark["kind"] = "break"): BreakMark => ({
    kind,
    at,
    duration: 0.5,
    leftPct: 0,
    widthPct: 0,
  });

  it("lists each distinct break once, not mixed when the stations agree", () => {
    const result = typeBreakMarks([[mark(2)], [mark(2)]]);
    expect(result.map((m) => [m.at, m.mixed])).toEqual([[2, false]]);
  });

  it("flags every mark mixed when the stations' breaks differ", () => {
    const result = typeBreakMarks([[mark(2)], [mark(3), mark(2)]]);
    expect(result.map((m) => [m.at, m.mixed])).toEqual([
      [2, true],
      [3, true],
    ]);
  });
});
