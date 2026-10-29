import { describe, expect, it } from "vitest";

import { buildDefaults } from "@/lib/mock/defaults";

import { cutoffMarker, linesBetween, outboundProfile, releaseBlocks } from "./wms-lane";

const wms = buildDefaults().wms;
const flat = Array.from({ length: 24 }, () => 100);
const ramp = Array.from({ length: 24 }, (_, h) => h * 10);

describe("outboundProfile", () => {
  it("is null without a dataset profile", () => {
    expect(outboundProfile(undefined, wms)).toBeNull();
    expect(outboundProfile([1, 2], wms)).toBeNull();
  });

  it("scales by volume and keeps only the data window", () => {
    const profile = outboundProfile(flat, {
      ...wms,
      volumeMultiplier: 1.5,
      dataWindow: { startHour: 6, endHour: 18 },
    })!;
    expect(profile[5]).toBe(0);
    expect(profile[6]).toBe(150);
    expect(profile[17]).toBe(150);
    expect(profile[18]).toBe(0);
  });

  it("reshapes the curve as the design does", () => {
    expect(
      outboundProfile(ramp, { ...wms, outboundDistribution: "flatline" })!.every((v) => v === 115),
    ).toBe(true);
    expect(
      outboundProfile(ramp, { ...wms, outboundDistribution: "staggered" })!.slice(1, 3),
    ).toEqual([6, 27]);
    const pareto = outboundProfile(ramp, { ...wms, outboundDistribution: "pareto" })!;
    expect(pareto[23]).toBeCloseTo(230 * 1.4);
    expect(pareto[10]).toBeLessThan(100);
  });
});

describe("linesBetween", () => {
  it("counts spans that don't start on the hour exactly (review of #46)", () => {
    expect(linesBetween(ramp, 8.5, 9.25)).toBe(Math.round(80 * 0.5 + 90 * 0.25));
    // Three waves over 8 hours add up to what streaming releases.
    const waves = releaseBlocks({ ...wms, release: { pattern: "waves", waves: 3 } }, 8, 8, ramp);
    const streaming = releaseBlocks(
      { ...wms, release: { pattern: "streaming", waves: 3 } },
      8,
      8,
      ramp,
    );
    const total = waves.reduce((sum, wave) => sum + (wave.lines ?? 0), 0);
    expect(Math.abs(total - streaming[0].lines!)).toBeLessThanOrEqual(1);
  });

  it("sums the lines released between two clock hours", () => {
    expect(linesBetween(flat, 8, 10)).toBe(200);
    expect(linesBetween(ramp, 23, 25)).toBe(230);
  });
});

describe("releaseBlocks", () => {
  it("splits the run into equal waves with their lines", () => {
    const blocks = releaseBlocks({ ...wms, release: { pattern: "waves", waves: 4 } }, 8, 8, flat);
    expect(blocks.map((b) => [b.label, b.from, b.hours, b.leftPct, b.lines])).toEqual([
      ["Wave 1", 0, 2, 0, 200],
      ["Wave 2", 2, 2, 25, 200],
      ["Wave 3", 4, 2, 50, 200],
      ["Wave 4", 6, 2, 75, 200],
    ]);
  });

  it("is one streaming block, with no line counts without a profile", () => {
    expect(
      releaseBlocks({ ...wms, release: { pattern: "streaming", waves: 4 } }, 8, 8, null),
    ).toEqual([
      {
        label: "Streaming · continuous release",
        from: 0,
        hours: 8,
        leftPct: 0,
        widthPct: 100,
        lines: null,
      },
    ]);
  });
});

describe("cutoffMarker", () => {
  it("is a marker inside the run, or a note before or after it", () => {
    expect(cutoffMarker(14, 8, 8)).toEqual({ where: "inside", pct: 75, label: "Cutoff 14:00" });
    expect(cutoffMarker(18, 8, 8)).toEqual({
      where: "after",
      label: "Cutoff 18:00 · after run end",
    });
    expect(cutoffMarker(6, 8, 8)).toEqual({
      where: "before",
      label: "Cutoff 06:00 · before run start",
    });
  });
});
