import { describe, expect, it } from "vitest";

import { addChange, controlAt, hoursAt, pause, resume, startSession, stop } from "./session";

const T0 = 1_000_000;
const sec = (s: number) => T0 + s * 1000;

describe("run session clock", () => {
  it("runs one warehouse minute per second, up to the run length", () => {
    const s = startSession("x", T0);
    expect(hoursAt(s, 8, sec(90))).toBe(1.5);
    expect(hoursAt(s, 8, sec(10_000))).toBe(8);
  });

  it("freezes while paused and goes on from there", () => {
    let s = startSession("x", T0);
    s = pause(s, sec(60));
    expect(hoursAt(s, 8, sec(600))).toBe(1);
    expect(controlAt(s, 8, sec(600)).paused).toBe(true);
    s = resume(s, sec(600));
    expect(hoursAt(s, 8, sec(660))).toBe(2);
  });

  it("stops for good at the hour it was stopped", () => {
    const s = stop(startSession("x", T0), 8, sec(150));
    expect(hoursAt(s, 8, sec(9_000))).toBe(2.5);
    expect(pause(s, sec(200))).toBe(s);
  });

  it("stamps live changes with the current hour", () => {
    const s = addChange(startSession("x", T0), { kind: "bots", bots: 22 }, 8, sec(30));
    expect(s.changes).toEqual([{ kind: "bots", bots: 22, atH: 0.5 }]);
  });
});
