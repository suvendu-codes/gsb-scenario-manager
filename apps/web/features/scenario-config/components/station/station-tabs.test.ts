import { describe, expect, it } from "vitest";

import { configCatalog } from "../../catalog";
import { tabOf } from "./station-tabs";

const station = configCatalog.modules.find((module) => module.id === "station")!;
const perStation = station.sections.filter((section) => section.scope !== "allStations");

describe("tabOf", () => {
  it("puts each per-station section in the design's tab", () => {
    expect(perStation.map((section) => [section.id, tabOf(section)])).toEqual([
      ["schedule", "modes"],
      ["structure", "setup"],
      ["variance", "setup"],
      ["limits", "setup"],
      ["gravityInduction", "setup"],
      ["easyLoop", "setup"],
      ["operations", "ops"],
    ]);
  });
});
