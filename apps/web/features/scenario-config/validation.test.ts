import { describe, expect, it } from "vitest";

import { buildDefaults } from "@/lib/mock/defaults";
import { computeIssues, maxTeaCount, validateConfig } from "./validation";
import type { ConfigValues, ScheduleBlock } from "./types";
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

/** The problems reduced to what a client branches on: code and path. */
const codes = (problems: Array<{ code: string; path?: string }>) =>
  problems.map((p) => [p.code, p.path]);

describe("validateConfig", () => {
  it("accepts the defaults", () => {
    expect(validateConfig(buildDefaults(), RUN)).toEqual([]);
  });

  it("rejects a schedule that does not fill the run, with the numbers as params", () => {
    const config = withConfig((c) => {
      c.station.stations["PPS-102"].schedule = [{ hours: 6, mode: "pick", breaks: [] }];
    });
    expect(validateConfig(config, RUN)).toEqual([
      {
        code: "SCHEDULE_TOTAL_MISMATCH",
        message: "PPS-102: the schedule adds up to 6h, but the run is 8h.",
        params: { stationId: "PPS-102", actualHours: 6, expectedHours: 8 },
        path: "station.stations.PPS-102.schedule",
      },
    ]);
  });

  it("rejects tea breaks that do not fit their block", () => {
    const tooLong = withConfig((c) => {
      c.station.stations["PPS-102"].schedule = [
        {
          hours: 0.5,
          mode: "pick",
          breaks: [{ id: "t1", type: "tea", pattern: "staggered", durationMinutes: 45, count: 1 }],
        },
        { hours: 7.5, mode: "put", breaks: [] },
      ];
    });
    expect(validateConfig(tooLong, RUN)).toEqual([
      expect.objectContaining({
        code: "TEA_BREAK_TOO_LONG",
        message: "PPS-102: a tea break is longer than its 0.5h block.",
        params: { stationId: "PPS-102", periodHours: 0.5, durationMinutes: 45 },
      }),
      // 45 minutes of tea in a half-hour block also leaves no time to work.
      expect.objectContaining({ code: "BREAKS_EXCEED_BLOCK" }),
    ]);

    const tooMany = withConfig((c) => {
      c.station.stations["PPS-102"].schedule = [
        {
          hours: 1,
          mode: "pick",
          breaks: [{ id: "t1", type: "tea", pattern: "random", durationMinutes: 30, count: 3 }],
        },
        { hours: 7, mode: "put", breaks: [] },
      ];
    });
    expect(validateConfig(tooMany, RUN)).toEqual([
      expect.objectContaining({
        code: "TEA_BREAK_TOO_MANY",
        message: "PPS-102: too many tea breaks of 30 min in 1h.",
        params: { stationId: "PPS-102", periodHours: 1, durationMinutes: 30, count: 3 },
      }),
      expect.objectContaining({ code: "BREAKS_EXCEED_BLOCK" }),
    ]);
  });

  it("rejects a regular break that never happens, a repeated mode and a mode not allowed", () => {
    const config = withConfig((c) => {
      c.station.stations["PPS-102"].schedule = [
        {
          hours: 2,
          mode: "pick",
          breaks: [{ id: "b1", type: "break", everyHours: 3, durationHours: 0.5 }],
        },
        { hours: 6, mode: "pick", breaks: [] },
      ];
    });
    expect(validateConfig(config, RUN, { "PPS-102": ["put", "audit"] }).map((p) => p.code)).toEqual(
      ["MODE_NOT_ALLOWED", "BREAK_EVERY_TOO_LONG", "SCHEDULE_MODE_REPEATED", "MODE_NOT_ALLOWED"],
    );
  });

  it("rejects a regular break as long as its interval, and breaks that fill their block", () => {
    const schedule = (breaks: ScheduleBlock["breaks"]) =>
      withConfig((c) => {
        c.station.stations["PPS-102"].schedule = [
          { hours: 4, mode: "pick", breaks },
          { hours: 4, mode: "put", breaks: [] },
        ];
      });
    const codes = (config: ReturnType<typeof schedule>) =>
      validateConfig(config, RUN).map((problem) => problem.code);

    // Every half hour for two hours: no time left to work.
    expect(
      codes(schedule([{ id: "b", type: "break", everyHours: 0.5, durationHours: 2 }])),
    ).toEqual(["BREAK_LONGER_THAN_INTERVAL", "BREAKS_EXCEED_BLOCK"]);
    // Each tea break fits on its own, but together they take the whole 4h block.
    const tea = (id: string) =>
      ({ id, type: "tea", pattern: "staggered", durationMinutes: 60, count: 2 }) as const;
    expect(codes(schedule([tea("a"), tea("b")]))).toEqual(["BREAKS_EXCEED_BLOCK"]);
    // A break every 4h in a 4h block never happens.
    expect(
      codes(schedule([{ id: "b", type: "break", everyHours: 4, durationHours: 0.5 }])),
    ).toEqual(["BREAK_EVERY_TOO_LONG"]);
    // Within all limits.
    expect(
      codes(schedule([{ id: "b", type: "break", everyHours: 2, durationHours: 0.5 }])),
    ).toEqual([]);
  });

  it("accepts a station with no blocks: it is not assigned", () => {
    const config = withConfig((c) => {
      c.station.stations["PPS-102"].schedule = [];
    });
    expect(validateConfig(config, RUN)).toEqual([]);
  });

  it("rejects an empty data window and duplicate order types", () => {
    const config = withConfig((c) => {
      c.wms.dataWindow = { startHour: 10, endHour: 10 };
      c.wms.orderTypes = ["inbound", "inbound"];
    });
    const problems = validateConfig(config, RUN);
    expect(codes(problems)).toEqual([
      ["DATA_WINDOW_EMPTY", "wms.dataWindow"],
      ["ORDER_TYPES_DUPLICATE", "wms.orderTypes"],
    ]);
    expect(problems[0]).toMatchObject({
      message: "The data window must start before it ends.",
      params: { startHour: 10, endHour: 10 },
    });
    expect(problems[1].message).toBe("Order types can't be listed twice.");
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
    expect(validateConfig(config, RUN)).toEqual([
      {
        code: "SCHEDULER_WEIGHTS_ALL_ZERO",
        message: "The pick scheduler weights can't all be 0.",
        path: "station.global.pickScheduler.weights",
      },
    ]);
  });

  it("rejects more staffed positions than front positions", () => {
    const config = withConfig((c) => {
      c.station.stations["PPS-101"].structure.staffedFrontPositions = 2;
    });
    expect(validateConfig(config, RUN)).toEqual([
      {
        code: "STAFFED_POSITIONS_EXCEED",
        message: "PPS-101: more staffed positions than front positions.",
        params: { stationId: "PPS-101", staffedPositions: 2, frontPositions: 1 },
        path: "station.stations.PPS-101.structure.staffedFrontPositions",
      },
    ]);
  });

  it("rejects a put flow that does not belong to the category and side", () => {
    const config = withConfig((c) => {
      c.station.stations["PPS-104"].operations.put.behavior.back = "unstaged-put-front";
    });
    expect(validateConfig(config, RUN)).toEqual([
      {
        code: "PUT_FLOW_NOT_ALLOWED",
        message: 'PPS-104: "unstaged-put-front" is not a back put flow for put.',
        params: {
          stationId: "PPS-104",
          flowId: "unstaged-put-front",
          side: "back",
          category: "put",
        },
        path: "station.stations.PPS-104.operations.put.behavior.back",
      },
    ]);
  });

  it("only checks the sides in use", () => {
    const config = withConfig((c) => {
      c.station.stations["PPS-104"].operations.put.behavior.front = "carrier-scan-put-front";
    });
    expect(validateConfig(config, RUN)).toEqual([]);
  });

  it("returns every problem at once, not just the first", () => {
    const config = withConfig((c) => {
      c.wms.dataWindow = { startHour: 5, endHour: 5 };
      c.station.stations["PPS-101"].schedule = [{ hours: 3, mode: "pick", breaks: [] }];
      c.station.stations["PPS-102"].schedule = [{ hours: 4, mode: "pick", breaks: [] }];
      c.station.stations["PPS-103"].structure.staffedFrontPositions = 2;
    });
    expect(codes(validateConfig(config, RUN))).toEqual([
      ["DATA_WINDOW_EMPTY", "wms.dataWindow"],
      ["SCHEDULE_TOTAL_MISMATCH", "station.stations.PPS-101.schedule"],
      ["SCHEDULE_TOTAL_MISMATCH", "station.stations.PPS-102.schedule"],
      ["STAFFED_POSITIONS_EXCEED", "station.stations.PPS-103.structure.staffedFrontPositions"],
    ]);
  });
});

describe("computeIssues", () => {
  it("reports nothing for the defaults with the required datasets attached", () => {
    expect(computeIssues(buildDefaults(), readyDatasets)).toEqual([]);
  });

  it("reports a missing or invalid dataset", () => {
    const expected = {
      module: "datasets",
      code: "DATASET_MISSING_OR_INVALID",
      message: "A dataset is missing or doesn’t match the site map",
    };
    const none: ScenarioDatasets = {
      inbound: null,
      outbound: null,
      masterdata: null,
      mockput: null,
    };
    expect(computeIssues(buildDefaults(), none)).toContainEqual(expected);

    const invalid = { ...readyDatasets, outbound: record("outbound", false) };
    expect(computeIssues(buildDefaults(), invalid)).toContainEqual(expected);

    const badOptional = { ...readyDatasets, mockput: record("mockput", false) };
    expect(computeIssues(buildDefaults(), badOptional)).toContainEqual(expected);

    const goodOptional = { ...readyDatasets, mockput: record("mockput") };
    expect(computeIssues(buildDefaults(), goodOptional)).toEqual([]);
  });

  it("reports no order type, no scheduled station and an empty fleet", () => {
    const config = withConfig((c) => {
      c.wms.orderTypes = [];
      for (const station of Object.values(c.station.stations)) {
        station.schedule = [];
      }
      c.agent.fleet = { htm: 0, vtm: 0 };
    });
    expect(computeIssues(config, readyDatasets)).toEqual([
      {
        module: "wms",
        code: "NO_ORDER_TYPE",
        message: "Choose at least one order type",
        path: "wms.orderTypes",
      },
      {
        module: "station",
        code: "NO_STATION_SCHEDULED",
        message: "No station is scheduled to work",
      },
      { module: "agent", code: "NO_BOTS", message: "The fleet has no bots", path: "agent.fleet" },
    ]);
  });

  it("reports a station scheduled for put without a put flow, naming the station in params", () => {
    const config = withConfig((c) => {
      c.station.stations["PPS-104"].operations.put.behavior.back = null;
    });
    expect(computeIssues(config, readyDatasets)).toEqual([
      {
        module: "station",
        code: "PUT_FLOW_MISSING",
        message: "PPS-104 has no put behaviour",
        params: { stationId: "PPS-104" },
        path: "station.stations.PPS-104.operations.put",
      },
    ]);
  });

  it("ignores a missing put flow on a station that does not put", () => {
    const config = withConfig((c) => {
      c.station.stations["PPS-102"].operations.put.behavior.back = null;
    });
    expect(computeIssues(config, readyDatasets)).toEqual([]);
  });
});
