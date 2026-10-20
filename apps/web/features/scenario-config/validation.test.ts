import { describe, expect, it } from "vitest";

import { buildDefaults } from "./defaults";
import { computeIssues, maxTeaCount, validateConfig } from "./validation";
import type { ConfigValues } from "./types";
import type { DatasetRecord, ScenarioDatasets } from "@/features/scenario-setup/types";

const RUN = 8;

function record(slot: DatasetRecord["slot"], valid = true): DatasetRecord {
  return {
    slot,
    fileName: `${slot}.csv`,
    source: "sample",
    sizeBytes: null,
    uploadedAt: "2026-10-01T00:00:00.000Z",
    valid,
    issues: valid ? [] : ["bad row"],
    profile: {},
  };
}

const readyDatasets: ScenarioDatasets = {
  inbound: record("inbound"),
  outbound: record("outbound"),
  masterdata: record("masterdata"),
  mockput: null,
};

/** The defaults with `change` applied to a copy. */
function withConfig(change: (config: ConfigValues) => void): ConfigValues {
  const config = buildDefaults();
  change(config);
  return config;
}

describe("maxTeaCount", () => {
  it("fits as many breaks as the period allows, between 1 and 6", () => {
    expect(maxTeaCount(4, 10)).toBe(6);
    expect(maxTeaCount(4, 60)).toBe(4);
    expect(maxTeaCount(0.5, 60)).toBe(1);
    expect(maxTeaCount(8, 5)).toBe(6);
  });
});

describe("validateConfig", () => {
  it("accepts the defaults", () => {
    expect(validateConfig(buildDefaults(), RUN)).toEqual([]);
  });

  it("rejects a schedule that does not fill the run", () => {
    const config = withConfig((c) => {
      c.station.stations["PPS-102"].schedule = [{ hours: 6, mode: "pick", teaBreaks: [] }];
    });
    expect(validateConfig(config, RUN)).toEqual([
      "PPS-102: the schedule adds up to 6h, but the run is 8h.",
    ]);
  });

  it("rejects tea breaks that do not fit their period", () => {
    const tooLong = withConfig((c) => {
      c.station.stations["PPS-102"].schedule = [
        { hours: 1, mode: "pick", teaBreaks: [] },
        { hours: 7, mode: "put", teaBreaks: [] },
      ];
      c.station.stations["PPS-102"].schedule[0].teaBreaks = [
        { id: "t1", pattern: "staggered", durationMinutes: 90, count: 1 },
      ];
    });
    expect(validateConfig(tooLong, RUN)[0]).toMatch(/PPS-102: a tea break is longer/);

    const tooMany = withConfig((c) => {
      c.station.stations["PPS-102"].schedule[0].teaBreaks = [
        { id: "t1", pattern: "random", durationMinutes: 120, count: 6 },
      ];
    });
    expect(validateConfig(tooMany, RUN)[0]).toMatch(/PPS-102: too many tea breaks/);
  });

  it("rejects an empty data window and duplicate order types", () => {
    const config = withConfig((c) => {
      c.wms.dataWindow = { startHour: 10, endHour: 10 };
      c.wms.orderTypes = ["inbound", "inbound"];
    });
    expect(validateConfig(config, RUN)).toEqual([
      "The data window must start before it ends.",
      "Order types can't be listed twice.",
    ]);
  });

  it("rejects scheduler weights that are all 0", () => {
    const config = withConfig((c) => {
      c.station.global.pickScheduler.weights = {
        ppf: 0,
        pbt: 0,
        pbtBreached: 0,
        pbtRisk: 0,
        largeOrders: 0,
        skuConsolidation: 0,
      };
    });
    expect(validateConfig(config, RUN)).toEqual(["The pick scheduler weights can't all be 0."]);
  });

  it("rejects more staffed positions than front positions", () => {
    const config = withConfig((c) => {
      c.station.stations["PPS-101"].structure.staffedFrontPositions = 2;
    });
    expect(validateConfig(config, RUN)).toEqual([
      "PPS-101: more staffed positions than front positions.",
    ]);
  });

  it("rejects All-stations lists that name unknown or repeated stations", () => {
    const config = withConfig((c) => {
      c.station.apply.schedule = ["PPS-999"];
      c.station.override.structure = ["PPS-101", "PPS-101"];
    });
    expect(validateConfig(config, RUN)).toEqual([
      "Unknown station: PPS-999.",
      "A station is listed twice.",
    ]);
  });

  it("rejects a put flow that does not belong to the category and side", () => {
    const config = withConfig((c) => {
      c.station.stations["PPS-104"].operations.put.behavior.back = "unstaged-put-front";
    });
    expect(validateConfig(config, RUN)[0]).toMatch(
      /PPS-104: "unstaged-put-front" is not a back put flow/,
    );
  });

  it("only checks the sides in use", () => {
    const config = withConfig((c) => {
      c.station.stations["PPS-104"].operations.put.behavior.front = "carrier-scan-put-front";
    });
    expect(validateConfig(config, RUN)).toEqual([]);
  });
});

describe("computeIssues", () => {
  it("reports nothing for the defaults with the required datasets attached", () => {
    expect(computeIssues(buildDefaults(), readyDatasets)).toEqual([]);
  });

  it("reports a missing or invalid dataset", () => {
    const message = "A dataset is missing or doesn’t match the site map";
    const none: ScenarioDatasets = {
      inbound: null,
      outbound: null,
      masterdata: null,
      mockput: null,
    };
    expect(computeIssues(buildDefaults(), none)).toContainEqual({ module: "datasets", message });

    const invalid = { ...readyDatasets, outbound: record("outbound", false) };
    expect(computeIssues(buildDefaults(), invalid)).toContainEqual({ module: "datasets", message });

    const badOptional = { ...readyDatasets, mockput: record("mockput", false) };
    expect(computeIssues(buildDefaults(), badOptional)).toContainEqual({
      module: "datasets",
      message,
    });

    const goodOptional = { ...readyDatasets, mockput: record("mockput") };
    expect(computeIssues(buildDefaults(), goodOptional)).toEqual([]);
  });

  it("reports no order type, no scheduled station and an empty fleet", () => {
    const config = withConfig((c) => {
      c.wms.orderTypes = [];
      for (const station of Object.values(c.station.stations)) {
        station.schedule = [{ hours: 8, mode: "off", teaBreaks: [] }];
      }
      c.agent.fleet = { htm: 0, vtm: 0 };
    });
    expect(computeIssues(config, readyDatasets)).toEqual([
      { module: "wms", message: "Choose at least one order type" },
      { module: "station", message: "No station is scheduled to work" },
      { module: "agent", message: "The fleet has no bots" },
    ]);
  });

  it("reports a station scheduled for put without a put flow", () => {
    const config = withConfig((c) => {
      c.station.stations["PPS-104"].operations.put.behavior.back = null;
    });
    expect(computeIssues(config, readyDatasets)).toEqual([
      { module: "station", message: "PPS-104 has no put behaviour" },
    ]);
  });

  it("ignores a missing put flow on a station that does not put", () => {
    const config = withConfig((c) => {
      c.station.stations["PPS-102"].operations.put.behavior.back = null;
    });
    expect(computeIssues(config, readyDatasets)).toEqual([]);
  });
});
