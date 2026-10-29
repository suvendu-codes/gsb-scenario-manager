import { describe, expect, it } from "vitest";

import { configCatalog } from "./catalog";
import { buildDefaults } from "@/lib/mock/defaults";
import { isFieldVisible, resolveField, setValueAtPath, withStationId } from "./field-path";
import type { CatalogField } from "./types";

const config = buildDefaults();
const field = (path: string) => {
  const found = configCatalog.modules
    .flatMap((m) => m.sections)
    .flatMap((s) => s.fields)
    .find((f) => f.path === path);
  if (!found) throw new Error(`no field ${path}`);
  return found;
};

describe("setValueAtPath", () => {
  it("returns a copy with one value changed", () => {
    const next = setValueAtPath(config, "wms.release.waves", 6);

    expect(next.wms.release.waves).toBe(6);
    expect(config.wms.release.waves).toBe(4);
    expect(next.agent).toEqual(config.agent);
  });

  it("can set an array or a null", () => {
    const withTypes = setValueAtPath(config, "wms.orderTypes", ["audit"]);
    expect(withTypes.wms.orderTypes).toEqual(["audit"]);

    const path = "station.stations.PPS-101.operations.put.behavior.front";
    expect(
      setValueAtPath(config, path, null).station.stations["PPS-101"].operations.put.behavior.front,
    ).toBeNull();
  });

  it("throws for a path that does not exist", () => {
    expect(() => setValueAtPath(config, "wms.nope", 1)).toThrow("Unknown config path: wms.nope");
    expect(() => setValueAtPath(config, "nope.deeper", 1)).toThrow();
    expect(() => setValueAtPath(config, "wms.__proto__.x", 1)).toThrow();
    expect(() => setValueAtPath(config, "", 1)).toThrow();
  });
});

describe("withStationId and resolveField", () => {
  it("fills the station id into a path", () => {
    expect(withStationId("station.stations.{stationId}.schedule", "PPS-102")).toBe(
      "station.stations.PPS-102.schedule",
    );
    expect(withStationId("wms.cutoffHour")).toBe("wms.cutoffHour");
  });

  it("fills it into the path, the condition and the max path of a field", () => {
    const resolved = resolveField(
      field("station.stations.{stationId}.structure.staffedBackSeats"),
      "PPS-103",
    );
    expect(resolved.path).toBe("station.stations.PPS-103.structure.staffedBackSeats");
    expect(resolved.visibleWhen?.path).toBe("station.stations.PPS-103.structure.binClearingSide");

    const staffed = resolveField(
      field("station.stations.{stationId}.structure.staffedFrontPositions"),
      "PPS-103",
    );
    expect(staffed.type === "stepper" && staffed.maxPath).toBe(
      "station.stations.PPS-103.structure.frontPositions",
    );
  });

  it("does not change the original field", () => {
    const original = field("station.stations.{stationId}.schedule");
    resolveField(original, "PPS-101");
    expect(original.path).toContain("{stationId}");
  });
});

describe("isFieldVisible", () => {
  it("follows the visibleWhen condition", () => {
    const waves = field("wms.release.waves");
    expect(isFieldVisible(waves, config)).toBe(true);
    expect(isFieldVisible(waves, setValueAtPath(config, "wms.release.pattern", "streaming"))).toBe(
      false,
    );
  });

  it("shows back seats only when bins are cleared at the back", () => {
    const seats = resolveField(
      field("station.stations.{stationId}.structure.staffedBackSeats"),
      "PPS-101",
    );
    expect(isFieldVisible(seats, config)).toBe(true);
    const front = setValueAtPath(
      config,
      "station.stations.PPS-101.structure.binClearingSide",
      "front",
    );
    expect(isFieldVisible(seats, front)).toBe(false);
  });

  it("does not show hardware fields, which the site registry does not describe", () => {
    const gi = field("station.stations.{stationId}.hardware.inductionSpeed") as CatalogField;
    const loop = field("station.stations.{stationId}.hardware.loopSpeed") as CatalogField;

    expect(isFieldVisible(gi, config)).toBe(false);
    expect(isFieldVisible(loop, config)).toBe(false);
  });

  it("shows fields with no condition", () => {
    expect(isFieldVisible(field("wms.criticalPct"), config)).toBe(true);
  });
});
