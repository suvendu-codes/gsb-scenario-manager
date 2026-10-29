import { describe, expect, it } from "vitest";

import { configCatalog } from "./catalog";
import { tabOf } from "./components/station/station-tabs";
import { searchSettings } from "./search";

const labels = (query: string, limit?: number) =>
  searchSettings(configCatalog, query, limit).map((hit) => hit.label);

describe("searchSettings", () => {
  it("finds nothing for an empty query", () => {
    expect(searchSettings(configCatalog, "")).toEqual([]);
    expect(searchSettings(configCatalog, "   ")).toEqual([]);
  });

  it("finds a setting by part of its label, ignoring case", () => {
    expect(labels("VOLUME")).toContain("Volume multiplier");
    // Label matches first, then fields whose section name ("Bot charging and turning") matches.
    expect(labels("charging")).toEqual([
      "HTM charging time",
      "VTM charging time",
      "HTM turning time",
      "VTM turning time",
    ]);
  });

  it("finds queue limit and rebalancing per station, in the Station Setup tab (review of #45)", () => {
    for (const query of ["queue limit", "rebalancing"]) {
      const [hit] = searchSettings(configCatalog, query);
      expect(hit).toMatchObject({ scope: "eachStation", sectionId: "limits" });
      const section = configCatalog.modules
        .find((module) => module.id === "station")!
        .sections.find((candidate) => candidate.id === hit.sectionId)!;
      expect(tabOf(section)).toBe("setup");
    }
  });

  it("says where a setting is shown: site-wide or per station", () => {
    expect(searchSettings(configCatalog, "front positions")[0].scope).toBe("eachStation");
    expect(searchSettings(configCatalog, "replenishment")[0].scope).toBe("allStations");
  });

  it("says which module and section the setting is in", () => {
    expect(searchSettings(configCatalog, "queue limit")[0]).toMatchObject({
      module: "station",
      moduleLabel: "Stations & operators",
      section: "Queue and rebalancing",
      label: "Queue limit",
    });
  });

  it("needs every word to match, in any order", () => {
    expect(labels("limit queue")).toContain("Queue limit");
    expect(labels("queue banana")).toEqual([]);
  });

  it("also matches the help text and the section name", () => {
    expect(labels("pick-before")).toContain("PBT window");
    expect(searchSettings(configCatalog, "bot types").map((hit) => hit.label)).toContain(
      "Quicktron HTM",
    );
  });

  it("puts labels that start with the query first, then ones that contain it", () => {
    const result = labels("pbt");
    expect(result[0].toLowerCase().startsWith("pbt")).toBe(true);
    const firstContaining = result.findIndex((label) => !label.toLowerCase().startsWith("pbt"));
    const lastStarting = result.map((l) => l.toLowerCase().startsWith("pbt")).lastIndexOf(true);
    expect(firstContaining === -1 || firstContaining > lastStarting).toBe(true);
  });

  it("finds scheduler weights and operations fields", () => {
    expect(labels("sku consolidation")).toContain("SKU consolidation");
    expect(labels("partial pick")).toContain("Allow partial picks");
    expect(labels("zero counts").length).toBeGreaterThan(0);
  });

  it("lists a setting that repeats for each station once", () => {
    const result = labels("front operation");
    expect(result.filter((label) => label === "Front operation")).toHaveLength(1);
  });

  it("returns at most the limit", () => {
    expect(labels("o", 3)).toHaveLength(3);
    expect(labels("o").length).toBeLessThanOrEqual(8);
  });
});
