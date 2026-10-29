import { describe, expect, it } from "vitest";

import { buildDefaults } from "@/lib/mock/defaults";

import { configValuesSchema } from "../schema";
import { configCatalog } from "./index";

const wms = configCatalog.modules.find((module) => module.id === "wms")!;
const paths = (sectionId: string) =>
  wms.sections.find((section) => section.id === sectionId)!.fields.map((field) => field.path);

describe("WMS panel (design v2)", () => {
  it("has the design's two sections, in its order", () => {
    expect(wms.sections.map((section) => section.label)).toEqual([
      "Volume & distribution",
      "Demand profile",
    ]);
    expect(paths("volume")).toEqual(["wms.volumeMultiplier", "wms.dataWindow"]);
    expect(paths("demand")).toEqual([
      "wms.orderSequencing",
      "wms.release.pattern",
      "wms.release.waves",
      "wms.orderTypes",
      "wms.criticalPct",
      "wms.pbtWindowHours",
      "wms.cutoffHour",
    ]);
  });

  it("moves order sequencing out of the station module", () => {
    const station = configCatalog.modules.find((module) => module.id === "station")!;
    const stationPaths = station.sections.flatMap((s) => s.fields.map((f) => f.path));
    expect(stationPaths).not.toContain("station.global.orderHandling.orderSequencing");
    expect(buildDefaults().wms.orderSequencing).toBe("fifo");
  });

  it("limits volume to 0.5-2.5 and order types to inbound and outbound, at least one", () => {
    const valid = (wmsPatch: object) => {
      const config = buildDefaults();
      return configValuesSchema.safeParse({ ...config, wms: { ...config.wms, ...wmsPatch } })
        .success;
    };
    expect(valid({ volumeMultiplier: 0.5 })).toBe(true);
    expect(valid({ volumeMultiplier: 2.5 })).toBe(true);
    expect(valid({ volumeMultiplier: 0.25 })).toBe(false);
    expect(valid({ volumeMultiplier: 2.75 })).toBe(false);
    expect(valid({ orderTypes: ["audit"] })).toBe(false);

    const orderTypes = wms.sections.flatMap((s) => s.fields).find((f) => f.type === "multiCheck");
    expect(orderTypes).toMatchObject({ minSelected: 1 });
  });
});
