import { describe, expect, it } from "vitest";

import { stationTypes, typeLabel, typeOfStation } from "./station-types";
import type { MapStation } from "./upstream/stations";

const station = (id: string, registryType: string) => ({ id, registryType }) as MapStation;

describe("typeLabel", () => {
  it("writes registry types for people", () => {
    expect(typeLabel("manual")).toBe("Manual");
    expect(typeLabel("ppp_manual")).toBe("PPP manual");
    expect(typeLabel("tote_extraction")).toBe("Tote extraction");
    expect(typeLabel("auto_tote_induction")).toBe("Auto tote induction");
  });

  it("keeps a type that is already written for people", () => {
    expect(typeLabel("Standard PPS")).toBe("Standard PPS");
  });
});

describe("stationTypes", () => {
  const types = stationTypes([
    station("1", "ppp_manual"),
    station("2", "manual"),
    station("3", "ppp_manual"),
    station("4", "manual"),
  ]);

  it("groups stations by registry type, in the order the types first appear", () => {
    expect(types).toEqual([
      { id: "ppp_manual", label: "PPP manual", stationIds: ["1", "3"] },
      { id: "manual", label: "Manual", stationIds: ["2", "4"] },
    ]);
  });

  it("finds a station's type", () => {
    expect(typeOfStation(types, "4")?.id).toBe("manual");
    expect(typeOfStation(types, "9")).toBeUndefined();
  });
});
