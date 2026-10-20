import { describe, expect, it } from "vitest";

import type { ScheduleBlock } from "../types";
import {
  blockStarts,
  maxBlockHours,
  maxTeaMinutes,
  newTeaBreak,
  removeBlock,
  resizeBlock,
  scaleBlocks,
  scheduledModes,
  splitBlock,
} from "./schedule-blocks";

function block(
  hours: number,
  mode: ScheduleBlock["mode"],
  teaBreaks: ScheduleBlock["teaBreaks"] = [],
) {
  return { hours, mode, teaBreaks };
}

const total = (blocks: ScheduleBlock[]) => blocks.reduce((sum, b) => sum + b.hours, 0);

describe("blockStarts and scheduledModes", () => {
  it("gives the start hour of each period", () => {
    expect(blockStarts([block(2, "pick"), block(1.5, "put"), block(4.5, "off")])).toEqual([
      0, 2, 3.5,
    ]);
  });

  it("lists the modes worked, once each, without off", () => {
    expect(
      scheduledModes([block(2, "pick"), block(2, "off"), block(2, "pick"), block(2, "audit")]),
    ).toEqual(["pick", "audit"]);
  });
});

describe("resizeBlock", () => {
  const blocks = [block(4, "pick"), block(4, "put")];

  it("moves the difference to the neighbour so the total stays the same", () => {
    const result = resizeBlock(blocks, 0, 6);
    expect(result.map((b) => b.hours)).toEqual([6, 2]);
    expect(total(result)).toBe(8);
  });

  it("uses the previous block as neighbour for the last one", () => {
    expect(resizeBlock(blocks, 1, 1).map((b) => b.hours)).toEqual([7, 1]);
  });

  it("snaps to half hours and keeps both at least half an hour", () => {
    expect(resizeBlock(blocks, 0, 3.2).map((b) => b.hours)).toEqual([3, 5]);
    expect(resizeBlock(blocks, 0, 100).map((b) => b.hours)).toEqual([7.5, 0.5]);
    expect(resizeBlock(blocks, 0, 0).map((b) => b.hours)).toEqual([0.5, 7.5]);
  });

  it("leaves a single period alone", () => {
    const single = [block(8, "pick")];
    expect(resizeBlock(single, 0, 3)).toBe(single);
  });

  it("shortens tea breaks that no longer fit", () => {
    const tea = { id: "t1", pattern: "staggered" as const, durationMinutes: 60, count: 3 };
    const result = resizeBlock([block(4, "pick", [tea]), block(4, "put")], 0, 0.5);
    expect(result[0].teaBreaks[0]).toMatchObject({ durationMinutes: 30, count: 1 });
  });
});

describe("maxBlockHours", () => {
  it("is the block plus its neighbour, less half an hour", () => {
    const blocks = [block(4, "pick"), block(3, "put"), block(1, "off")];
    expect(maxBlockHours(blocks, 0)).toBe(6.5);
    expect(maxBlockHours(blocks, 2)).toBe(3.5);
    expect(maxBlockHours([block(8, "pick")], 0)).toBe(8);
  });
});

describe("splitBlock", () => {
  it("splits in two halves of the same mode", () => {
    const result = splitBlock([block(4, "pick"), block(4, "put")], 0, () => "x");
    expect(result.map((b) => [b.hours, b.mode])).toEqual([
      [2, "pick"],
      [2, "pick"],
      [4, "put"],
    ]);
  });

  it("rounds the first half to half hours", () => {
    expect(splitBlock([block(1.5, "pick")], 0, () => "x").map((b) => b.hours)).toEqual([1, 0.5]);
    expect(splitBlock([block(1, "pick")], 0, () => "x").map((b) => b.hours)).toEqual([0.5, 0.5]);
  });

  it("does not split a period shorter than an hour", () => {
    const blocks = [block(0.5, "pick"), block(7.5, "put")];
    expect(splitBlock(blocks, 0, () => "x")).toBe(blocks);
  });

  it("gives the second half its own copies of the tea breaks", () => {
    const tea = { id: "t1", pattern: "random" as const, durationMinutes: 10, count: 2 };
    const [first, second] = splitBlock([block(4, "pick", [tea])], 0, () => "t2");
    expect(first.teaBreaks[0].id).toBe("t1");
    expect(second.teaBreaks[0]).toMatchObject({ id: "t2", pattern: "random", count: 2 });
  });
});

describe("removeBlock", () => {
  it("gives the time to the previous period, or the next for the first", () => {
    const blocks = [block(2, "pick"), block(3, "put"), block(3, "audit")];
    expect(removeBlock(blocks, 1).map((b) => [b.hours, b.mode])).toEqual([
      [5, "pick"],
      [3, "audit"],
    ]);
    expect(removeBlock(blocks, 0).map((b) => [b.hours, b.mode])).toEqual([
      [5, "put"],
      [3, "audit"],
    ]);
  });

  it("keeps the last remaining period", () => {
    const single = [block(8, "pick")];
    expect(removeBlock(single, 0)).toBe(single);
  });
});

describe("scaleBlocks", () => {
  it("keeps the proportions and fills the new length", () => {
    const result = scaleBlocks([block(4, "pick"), block(4, "put")], 8, 12);
    expect(result.map((b) => b.hours)).toEqual([6, 6]);
  });

  it("always adds up to the new length, in half hours", () => {
    for (const to of [1, 3, 5.5, 7, 12, 24]) {
      const result = scaleBlocks([block(3, "pick"), block(3, "put"), block(2, "audit")], 8, to);
      expect(total(result)).toBe(to);
      expect(result.every((b) => b.hours >= 0.5 && b.hours % 0.5 === 0)).toBe(true);
    }
  });

  it("drops periods that no longer fit", () => {
    const result = scaleBlocks(
      [block(2, "pick"), block(2, "put"), block(2, "audit"), block(2, "off")],
      8,
      1,
    );
    expect(total(result)).toBe(1);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("returns the same schedule when the length is unchanged", () => {
    const blocks = [block(8, "pick")];
    expect(scaleBlocks(blocks, 8, 8)).toBe(blocks);
  });
});

describe("tea helpers", () => {
  it("builds a default tea break and limits its length by the period", () => {
    expect(newTeaBreak("t1")).toEqual({
      id: "t1",
      pattern: "staggered",
      durationMinutes: 10,
      count: 1,
    });
    expect(maxTeaMinutes(0.5)).toBe(30);
    expect(maxTeaMinutes(4)).toBe(120);
  });
});
