import { describe, expect, it } from "vitest";

import type { ScheduleBlock } from "../../types";
import { formatHours, formatRange, newBreakId, scheduleTotal } from "./schedule-text";

const block = (hours: number, mode: ScheduleBlock["mode"]): ScheduleBlock => ({
  hours,
  mode,
  breaks: [],
});

describe("formatHours and formatRange", () => {
  it("writes whole and half hours without extra zeros", () => {
    expect(formatHours(4)).toBe("4h");
    expect(formatHours(1.5)).toBe("1.5h");
    expect(formatHours(0.5)).toBe("0.5h");
  });

  it("writes the span of a period", () => {
    expect(formatRange(0, 4)).toBe("0h – 4h");
    expect(formatRange(2.5, 1.5)).toBe("2.5h – 4h");
  });
});

describe("scheduleTotal", () => {
  const blocks = [block(4, "pick"), block(3.5, "put"), block(0.5, "audit")];

  it("counts the blocks and adds up the hours", () => {
    expect(scheduleTotal(blocks)).toBe("3 blocks · 8h");
    expect(scheduleTotal([block(8, "pick")])).toBe("1 block · 8h");
  });
});

describe("newBreakId", () => {
  it("makes short ids that differ", () => {
    const ids = new Set(Array.from({ length: 50 }, () => newBreakId()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(/^t[0-9a-z]{8}$/);
  });
});
