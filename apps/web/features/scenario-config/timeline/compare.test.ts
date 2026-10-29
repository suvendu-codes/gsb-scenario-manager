import { describe, expect, it } from "vitest";

import { buildDefaults } from "@/lib/mock/defaults";

import { configCatalog } from "../catalog";
import type { ConfigValues } from "../types";
import type { MapStation } from "../upstream/stations";
import { COMPARE_COLUMNS, compareStationRow, compareTypeRow, type CompareContext } from "./compare";

const info = (id: string, allowedModes: MapStation["allowedModes"]) =>
  ({ id, label: id, registryType: "manual", allowedModes }) as MapStation;

function context(edit: (config: ConfigValues) => void = () => {}): CompareContext {
  const defaults = buildDefaults();
  const config = structuredClone(defaults);
  edit(config);
  return {
    config,
    defaults,
    catalog: configCatalog,
    runHours: 8,
    stations: [info("PPS-101", ["pick", "put", "audit"]), info("PPS-102", ["pick"])],
  };
}

const values = (cells: ReturnType<typeof compareStationRow>) => cells.map((cell) => cell.value);

describe("compare columns", () => {
  it("are the design's ten columns", () => {
    expect(COMPARE_COLUMNS.map((column) => column.label)).toEqual([
      "Modes",
      "Pick variance",
      "Put variance",
      "Audit variance",
      "Total breaks",
      "Queue limit",
      "Rebalancing",
      "Scheduling strategy",
      "Put category",
      "Confirm zero counts",
    ]);
  });
});

describe("compareStationRow", () => {
  it("shows a station's values, with — for modes it can't work in", () => {
    const row = values(compareStationRow(context(), "PPS-102"));
    expect(row.slice(0, 7)).toEqual(["pick", "0 s", "0 s", "0 s", "3", "10", "On"]);
    expect(row[7]).toEqual(expect.any(String));
    expect(row.slice(8)).toEqual([null, null]);
  });

  it("marks values that differ from the defaults", () => {
    const row = compareStationRow(
      context((c) => {
        c.station.stations["PPS-101"].setup.queueLimit = 20;
      }),
      "PPS-101",
    );
    expect(row.map((cell) => cell.customized)).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
    ]);
  });
});

describe("compareTypeRow", () => {
  it("shows what the stations share, Mixed where they differ, — where nothing applies", () => {
    const row = values(compareTypeRow(context(), ["PPS-101", "PPS-102"]));
    expect(row[0]).toBe("Mixed");
    expect(row[1]).toBe("0 s");
    expect(row[8]).toBe(values(compareStationRow(context(), "PPS-101"))[8]);
    expect(values(compareTypeRow(context(), ["PPS-102"])).slice(8)).toEqual([null, null]);
  });

  it("is customized when any station is", () => {
    const c = context((config) => {
      config.station.stations["PPS-102"].setup.rebalancing = false;
    });
    const row = compareTypeRow(c, ["PPS-101", "PPS-102"]);
    expect(row[6]).toEqual({ value: "Mixed", customized: true });
  });
});
