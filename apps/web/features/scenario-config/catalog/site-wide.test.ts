import { describe, expect, it } from "vitest";

import { buildDefaults } from "@/lib/mock/defaults";

import { configValuesSchema } from "../schema";
import { configCatalog } from "./index";

const station = configCatalog.modules.find((module) => module.id === "station")!;
const siteWide = station.sections.filter((section) => section.scope === "allStations");

describe("site-wide station settings (design v2)", () => {
  it("are the pick scheduler, replenishment classes and time in error, in that order", () => {
    expect(siteWide.map((section) => section.label)).toEqual([
      "Pick scheduler",
      "Replenishment threshold",
      "Time in error",
    ]);
    expect(siteWide[1].fields.map((field) => field.label)).toEqual([
      "Class A",
      "Class B",
      "Class C",
    ]);
  });

  it("replace error injection with a percentage and one threshold with three classes", () => {
    const global = buildDefaults().station.global;
    expect(global.timeInErrorPct).toBe(5);
    expect(global.replenishment).toEqual({ a: 20, b: 20, c: 20 });
    expect(global).not.toHaveProperty("errorInjection");
    expect(global).not.toHaveProperty("limits");
  });

  it("checks the ranges", () => {
    const valid = (patch: object) => {
      const config = buildDefaults();
      config.station.global = { ...config.station.global, ...patch };
      return configValuesSchema.safeParse(config).success;
    };
    expect(valid({ timeInErrorPct: 50 })).toBe(true);
    expect(valid({ timeInErrorPct: 51 })).toBe(false);
    expect(valid({ replenishment: { a: 100, b: 0, c: 35 } })).toBe(true);
    expect(valid({ replenishment: { a: 22, b: 0, c: 35 } })).toBe(false);
  });
});
