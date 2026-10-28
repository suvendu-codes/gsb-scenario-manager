import { describe, expect, it } from "vitest";

import type { ScheduleBlock, ScheduleBreak, StationMode } from "../types";
import {
  addBreak,
  blockStarts,
  breakOccurrences,
  canSplitBlock,
  changeBlockMode,
  freeModes,
  maxBlockHours,
  newBreak,
  removeBlock,
  removeBreak,
  resizeBlock,
  scaleBlocks,
  scheduledModes,
  splitBlock,
  updateBreak,
} from "./schedule-blocks";

const ALL: StationMode[] = ["pick", "put", "audit"];

function block(hours: number, mode: StationMode, breaks: ScheduleBreak[] = []): ScheduleBlock {
  return { hours, mode, breaks };
}

const tea = (id: string, durationMinutes: number, count = 1): ScheduleBreak => ({
  id,
  type: "tea",
  pattern: "staggered",
  durationMinutes,
  count,
});
const regular = (id: string, everyHours: number, durationHours = 0.5): ScheduleBreak => ({
  id,
  type: "break",
  everyHours,
  durationHours,
});

const total = (blocks: ScheduleBlock[]) => blocks.reduce((sum, b) => sum + b.hours, 0);

describe("blockStarts, scheduledModes and freeModes", () => {
  const blocks = [block(2, "pick"), block(1.5, "put"), block(4.5, "audit")];

  it("gives each block's start hour and the modes in block order", () => {
    expect(blockStarts(blocks)).toEqual([0, 2, 3.5]);
    expect(scheduledModes(blocks)).toEqual(["pick", "put", "audit"]);
  });

  it("lists the allowed modes no block uses, in the usual order", () => {
    expect(freeModes([block(8, "put")], ALL)).toEqual(["pick", "audit"]);
    expect(freeModes([block(8, "put")], ["put", "audit"])).toEqual(["audit"]);
    expect(freeModes(blocks, ALL)).toEqual([]);
  });
});

describe("resizeBlock", () => {
  it("moves the difference to the next block so the total stays the same", () => {
    const result = resizeBlock([block(4, "pick"), block(4, "put")], 0, 5);
    expect(result.map((b) => b.hours)).toEqual([5, 3]);
  });

  it("uses the previous block as neighbour for the last one", () => {
    const result = resizeBlock([block(4, "pick"), block(4, "put")], 1, 2);
    expect(result.map((b) => b.hours)).toEqual([6, 2]);
  });

  it("snaps to half hours and keeps both at least half an hour", () => {
    expect(resizeBlock([block(4, "pick"), block(4, "put")], 0, 7.9).map((b) => b.hours)).toEqual([
      7.5, 0.5,
    ]);
    expect(maxBlockHours([block(4, "pick"), block(4, "put")], 0)).toBe(7.5);
  });

  it("fits the breaks of a block that gets shorter", () => {
    const blocks = [block(4, "pick"), block(4, "put", [tea("t", 60, 3), regular("b", 3)])];
    const [, shorter] = resizeBlock(blocks, 0, 7);
    expect(shorter.hours).toBe(1);
    expect(shorter.breaks).toEqual([tea("t", 60, 1), regular("b", 1)]);
  });
});

describe("changeBlockMode", () => {
  const blocks = [block(4, "pick"), block(4, "put")];

  it("sets a mode no other block has", () => {
    expect(scheduledModes(changeBlockMode(blocks, 0, "audit"))).toEqual(["audit", "put"]);
  });

  it("swaps with the block that already has the mode, so each mode stays in one block", () => {
    expect(scheduledModes(changeBlockMode(blocks, 0, "put"))).toEqual(["put", "pick"]);
  });
});

describe("splitBlock", () => {
  it("halves the block, giving the second half the first free allowed mode and no breaks", () => {
    const result = splitBlock([block(8, "put", [regular("b", 2)])], 0, ALL);
    expect(result).toEqual([block(4, "put", [regular("b", 2)]), block(4, "pick")]);
  });

  it("only uses modes the station allows", () => {
    expect(splitBlock([block(8, "put")], 0, ["put", "audit"])[1].mode).toBe("audit");
  });

  it("does not split with three blocks, no free mode, or less than an hour", () => {
    const three = [block(2, "pick"), block(2, "put"), block(4, "audit")];
    expect(canSplitBlock(three, 2, ALL)).toBe(false);
    expect(canSplitBlock([block(8, "put")], 0, ["put"])).toBe(false);
    expect(canSplitBlock([block(0.5, "pick"), block(7.5, "put")], 0, ALL)).toBe(false);
    expect(splitBlock([block(8, "put")], 0, ["put"])).toEqual([block(8, "put")]);
  });
});

describe("removeBlock", () => {
  it("gives the time to the previous block, or the next for the first", () => {
    const blocks = [block(2, "pick"), block(2, "put"), block(4, "audit")];
    expect(removeBlock(blocks, 1).map((b) => [b.mode, b.hours])).toEqual([
      ["pick", 4],
      ["audit", 4],
    ]);
    expect(removeBlock(blocks, 0).map((b) => [b.mode, b.hours])).toEqual([
      ["put", 4],
      ["audit", 4],
    ]);
  });

  it("keeps the last block", () => {
    expect(removeBlock([block(8, "pick")], 0)).toEqual([block(8, "pick")]);
  });
});

describe("breaks", () => {
  it("adds a regular or a tea break with the design's starting values", () => {
    const b = block(8, "pick");
    expect(addBreak(b, "break", "b1").breaks).toEqual([regular("b1", 2)]);
    expect(addBreak(b, "tea", "t1").breaks).toEqual([tea("t1", 10)]);
  });

  it("fits a new break to a short block", () => {
    expect(newBreak(block(1, "pick"), "break", "b")).toEqual(regular("b", 1));
  });

  it("holds at most four breaks per block", () => {
    let b = block(8, "pick");
    for (let i = 0; i < 6; i++) b = addBreak(b, "tea", `t${i}`);
    expect(b.breaks).toHaveLength(4);
  });

  it("updates and removes one break by id, fitting it to the block", () => {
    const b = block(2, "pick", [tea("t", 10), regular("b", 1)]);
    expect(updateBreak(b, tea("t", 30, 6)).breaks[0]).toEqual(tea("t", 30, 4));
    expect(removeBreak(b, "t").breaks).toEqual([regular("b", 1)]);
  });

  it("counts how many times a regular break happens in a block, never at its end", () => {
    expect(breakOccurrences(2, 8)).toBe(3);
    expect(breakOccurrences(2.5, 8)).toBe(3);
    expect(breakOccurrences(4, 4)).toBe(0);
    expect(breakOccurrences(0.5, 1)).toBe(1);
  });
});

describe("scaleBlocks", () => {
  it("keeps the proportions and fills the new length", () => {
    const result = scaleBlocks([block(4, "pick"), block(4, "put")], 8, 10);
    expect(result.map((b) => b.hours)).toEqual([5, 5]);
  });

  it("always adds up to the new length, in half hours", () => {
    const result = scaleBlocks([block(3, "pick"), block(2.5, "put"), block(2.5, "audit")], 8, 7);
    expect(total(result)).toBe(7);
    for (const b of result) expect(b.hours % 0.5).toBe(0);
  });

  it("drops blocks that no longer fit", () => {
    const result = scaleBlocks([block(2, "pick"), block(2, "put"), block(4, "audit")], 8, 1);
    expect(total(result)).toBe(1);
    expect(result.length).toBeLessThanOrEqual(2);
  });
});
