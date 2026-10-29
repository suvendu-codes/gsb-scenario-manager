import { describe, expect, it } from "vitest";

import { hashString } from "@/features/scenario-config/timeline/station-lane";

import { formatHM, MAX_BOTS, mockRunEngine, validBots, WARMUP_H } from "./engine";
import type { RunControl, RunInputs } from "./types";

const inputs: RunInputs = {
  scenarioId: "s",
  scenarioName: "Peak Day",
  runHours: 8,
  startClock: 8,
  cutoffHour: 14,
  bots: 20,
  stations: [
    {
      id: "1",
      label: "PPS 1",
      queueLimit: 10,
      schedule: [
        {
          hours: 4,
          mode: "pick",
          breaks: [{ id: "b", type: "break", everyHours: 2, durationHours: 0.5 }],
        },
        { hours: 4, mode: "put", breaks: [] },
      ],
    },
    { id: "2", label: "PPS 2", queueLimit: 10, schedule: [] },
  ],
};

const at = (nowH: number, extra: Partial<RunControl> = {}): RunControl => ({
  nowH,
  stoppedAtH: null,
  paused: false,
  changes: [],
  ...extra,
});
const snap = (control: RunControl) => mockRunEngine.snapshot(inputs, control);

describe("mock run engine", () => {
  it("warms up first: measures wait, stations start, bots come online", () => {
    const s = snap(at(WARMUP_H / 2));
    expect(s.phase).toBe("warming-up");
    expect(s.kpis.every((k) => k.status === "waiting" && k.value === null)).toBe(true);
    expect(s.stations.map((st) => st.state)).toEqual(["starting", "starting"]);
    expect(s.bots).toEqual({ total: 20, working: 0, ready: 20, error: 0 });
    expect(s.attention).toEqual({
      text: "Warming up. Measures fill in after the first few minutes.",
      severity: "info",
    });
  });

  it("follows each station's schedule: blocks, breaks and stations off shift", () => {
    expect(snap(at(1)).stations[0]).toMatchObject({ mode: "pick" });
    expect(["working", "queue-full"]).toContain(snap(at(1)).stations[0].state);
    expect(snap(at(2.2)).stations[0].state).toBe("on-break");
    expect(snap(at(1)).stations[1]).toMatchObject({ state: "off-shift", mode: null, queue: null });
    expect(snap(at(1)).stations[0].next).toBe("Put from 4h");
  });

  it("lists events up to now only, in order", () => {
    const titles = (h: number) => snap(at(h)).events.map((e) => e.title);
    expect(titles(1)).toEqual([
      "Run started and lasts 8h 00m",
      "Fleet is 20 bots",
      "Order cutoff is 14:00",
    ]);
    expect(titles(6.5)).toContain("PPS 1 switched to Put");
    expect(titles(6.5)).toContain("Order cutoff: no new orders are released");
    expect(titles(3.9)).not.toContain("PPS 1 switched to Put");
  });

  it("plays the scripted bot fault: one bot in error, a warning and attention", () => {
    const s = snap(at(3.1));
    expect(s.bots.error).toBe(1);
    expect(s.attention).toEqual({
      text: "1 bot in error. It is being recovered.",
      severity: "warning",
    });
    expect(s.events.some((e) => e.type === "warehouse" && e.severity === "warning")).toBe(true);
    expect(snap(at(3.5)).bots.error).toBe(0);
  });

  it("counts throughput up to now, below what is planned", () => {
    const early = snap(at(1)).kpis[0];
    const later = snap(at(3)).kpis[0];
    const value = (k: typeof early) => Number(k.value!.replace(/,/g, ""));
    expect(value(later)).toBeGreaterThan(value(early));
    expect(later.unit).toMatch(/^of [\d,]+ units$/);
  });

  it("takes live changes: a station turned off stops working, the fleet size changes", () => {
    const off = snap(at(2, { changes: [{ kind: "station", atH: 1, stationId: "1", on: false }] }));
    expect(off.stations[0]).toMatchObject({ state: "stopped", turnedOff: true });
    expect(off.events.map((e) => e.title)).toContain("PPS 1 was turned off");
    const value = (s: typeof off) => Number(s.kpis[0].value!.replace(/,/g, ""));
    expect(value(off)).toBeLessThan(value(snap(at(2))));

    const fleet = snap(at(2, { changes: [{ kind: "bots", atH: 1.5, bots: 25 }] }));
    expect(fleet.bots.total).toBe(25);
    expect(fleet.events.map((e) => e.title)).toContain("Fleet changed to 25 bots");
  });

  it("completes at the end of the run, and stops where it was stopped", () => {
    const done = snap(at(9));
    expect(done).toMatchObject({ phase: "completed", nowH: 8 });
    expect(done.kpis[0]).toMatchObject({ status: "done", detail: "Completed in 8h 00m" });
    expect(done.events.at(-1)?.title).toBe("Run completed");

    const stopped = snap(at(5, { stoppedAtH: 2.5 }));
    expect(stopped).toMatchObject({ phase: "stopped", nowH: 2.5 });
    expect(stopped.events.at(-1)?.title).toBe("Run stopped at 2h 30m");
    expect(stopped.kpis[0]).toMatchObject({
      status: "done",
      detail: "Up to 2h 30m, when it stopped",
    });
  });

  it("shows measures as waiting when stopped during the warm-up (review of #52)", () => {
    const s = snap(at(1, { stoppedAtH: WARMUP_H / 2 }));
    expect(s.phase).toBe("stopped");
    expect(s.kpis.every((k) => k.status === "waiting")).toBe(true);
  });

  it("keeps the fleet size a whole number within bounds, and ignores one that isn't a number", () => {
    const fleet = (bots: number) =>
      snap(at(2, { changes: [{ kind: "bots", atH: 1, bots }] })).bots.total;
    expect(fleet(-5)).toBe(0);
    expect(fleet(9999)).toBe(MAX_BOTS);
    expect(fleet(21.6)).toBe(22);
    expect(fleet(Number.NaN)).toBe(20);
    expect(validBots(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("gives events ids that don't change when an earlier event is added", () => {
    const ids = (control: RunControl) => new Map(snap(control).events.map((e) => [e.title, e.id]));
    const before = ids(at(6.5));
    const after = ids(
      at(6.5, { changes: [{ kind: "station", atH: 0.5, stationId: "1", on: false }] }),
    );
    for (const [title, id] of before) expect(after.get(title)).toBe(id);
    expect(new Set(after.values()).size).toBe(after.size);
  });

  it("never draws negative values: the hash behind them is never negative", () => {
    for (let i = 0; i < 2000; i++)
      expect(hashString(`key-${i}-${i * 7919}`)).toBeGreaterThanOrEqual(0);
    expect(hashString("\uffff".repeat(50))).toBeGreaterThanOrEqual(0);
  });

  it("is deterministic and pauses", () => {
    expect(snap(at(2.3))).toEqual(snap(at(2.3)));
    expect(snap(at(2.3, { paused: true })).phase).toBe("paused");
    expect(formatHM(1.85)).toBe("1h 51m");
  });
});
