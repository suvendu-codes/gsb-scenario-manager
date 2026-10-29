import { beforeEach, describe, expect, it, vi } from "vitest";

type ConfigStore = typeof import("./config-store");
type Store = typeof import("./store");

const DRAFT_ID = "9b1f3c52-6a1e-4d0b-8f3a-1c2d3e4f5a06";
const COMPLETED_ID = "9b1f3c52-6a1e-4d0b-8f3a-1c2d3e4f5a01";

/** Loads fresh copies of the stores, so each test starts from the seed data. */
async function load(): Promise<{ config: ConfigStore; store: Store }> {
  vi.resetModules();
  for (const key of ["mockScenarios", "mockDatasets", "mockConfigs"]) {
    delete (globalThis as Record<string, unknown>)[key];
  }
  return { config: await import("./config-store"), store: await import("./store") };
}

let config: ConfigStore;
let store: Store;

beforeEach(async () => {
  ({ config, store } = await load());
});

type Failure = {
  status: number;
  message: string;
  details: { code?: string; params?: Record<string, unknown>; problems?: ProblemShape[] };
};
type ProblemShape = {
  code: string;
  message: string;
  params?: Record<string, unknown>;
  path?: string;
};

/** Runs a patch that must fail and returns the error. */
function failure(id: string, body: Parameters<ConfigStore["patchScenarioConfig"]>[1]): Failure {
  try {
    config.patchScenarioConfig(id, body);
  } catch (error) {
    return error as Failure;
  }
  throw new Error("expected the patch to fail");
}

/** The codes and paths of a failure's problems. */
const problemCodes = (error: Failure) =>
  (error.details.problems ?? []).map((p) => [p.code, p.path]);

describe("getScenarioConfig", () => {
  it("returns the defaults with no overrides for a new scenario", () => {
    const result = config.getScenarioConfig(DRAFT_ID);

    expect(result.scenarioId).toBe(DRAFT_ID);
    expect(result.overrides).toEqual({});
    expect(result.runDurationHours).toBe(8);
    expect(result.defaults.wms.volumeMultiplier).toBe(1);
    expect(Object.keys(result.defaults.station.stations)).toHaveLength(49);
  });

  it("reports the missing datasets as an issue", () => {
    expect(config.getScenarioConfig(DRAFT_ID).issues).toEqual([
      {
        module: "datasets",
        code: "DATASET_MISSING_OR_INVALID",
        message: "A dataset is missing or doesn’t match the site map",
      },
    ]);
  });

  it("reports no issues once the required datasets are attached", () => {
    store.attachSample(DRAFT_ID, "inbound", "in-1");
    store.attachSample(DRAFT_ID, "outbound", "out-1");
    store.attachSample(DRAFT_ID, "masterdata", "md-1");

    expect(config.getScenarioConfig(DRAFT_ID).issues).toEqual([]);
  });

  it("throws 404 for an unknown scenario", () => {
    expect(() => config.getScenarioConfig("nope")).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });

  it("can read a scenario that is not a draft", () => {
    expect(config.getScenarioConfig(COMPLETED_ID).overrides).toEqual({});
  });
});

describe("patchScenarioConfig: set", () => {
  it("stores a changed value as an override and leaves the defaults alone", () => {
    const result = config.patchScenarioConfig(DRAFT_ID, { set: { "wms.volumeMultiplier": 2.25 } });

    expect(result.overrides).toEqual({ "wms.volumeMultiplier": 2.25 });
    expect(result.defaults.wms.volumeMultiplier).toBe(1);
    expect(config.getScenarioConfig(DRAFT_ID).overrides).toEqual({ "wms.volumeMultiplier": 2.25 });
  });

  it("keeps earlier overrides when another path is set", () => {
    config.patchScenarioConfig(DRAFT_ID, { set: { "wms.volumeMultiplier": 2 } });
    const result = config.patchScenarioConfig(DRAFT_ID, { set: { "agent.fleet.htm": 12 } });

    expect(result.overrides).toEqual({ "wms.volumeMultiplier": 2, "agent.fleet.htm": 12 });
  });

  it("drops an override when the value goes back to its default", () => {
    config.patchScenarioConfig(DRAFT_ID, { set: { "wms.volumeMultiplier": 2.25 } });
    const result = config.patchScenarioConfig(DRAFT_ID, { set: { "wms.volumeMultiplier": 1 } });

    expect(result.overrides).toEqual({});
  });

  it("replaces an array whole and compares it in order", () => {
    const schedule = [
      { hours: 2, mode: "put", teaBreaks: [] },
      { hours: 6, mode: "pick", teaBreaks: [] },
    ];
    const path = "station.stations.2.schedule";

    const result = config.patchScenarioConfig(DRAFT_ID, { set: { [path]: schedule } });

    expect(result.overrides).toEqual({ [path]: schedule });
  });

  it("puts order types in their usual order, so a reordered default is no change", () => {
    const result = config.patchScenarioConfig(DRAFT_ID, {
      set: { "wms.orderTypes": ["outbound", "inbound"] },
    });

    expect(result.overrides).not.toHaveProperty("wms.orderTypes");
  });

  it("stores the All-stations lists", () => {
    const result = config.patchScenarioConfig(DRAFT_ID, {
      set: { "station.override.schedule": ["3", "1"] },
    });

    expect(result.overrides["station.override.schedule"]).toEqual(["1", "3"]);
  });

  it("updates the issues from the new config", () => {
    const result = config.patchScenarioConfig(DRAFT_ID, { set: { "wms.orderTypes": [] } });

    expect(result.issues).toContainEqual({
      module: "wms",
      code: "NO_ORDER_TYPE",
      message: "Choose at least one order type",
      path: "wms.orderTypes",
    });
  });

  it("changes updatedAt", () => {
    const before = config.getScenarioConfig(DRAFT_ID).updatedAt;
    const after = config.patchScenarioConfig(DRAFT_ID, { set: { "agent.charging.htm": 20 } });

    expect(after.updatedAt).not.toBe(before);
  });
});

describe("patchScenarioConfig: reset", () => {
  beforeEach(() => {
    config.patchScenarioConfig(DRAFT_ID, {
      set: {
        "wms.volumeMultiplier": 2,
        "wms.release.waves": 6,
        "agent.fleet.htm": 12,
      },
    });
  });

  it("removes the override at one path", () => {
    const result = config.patchScenarioConfig(DRAFT_ID, { reset: ["wms.volumeMultiplier"] });

    expect(result.overrides).toEqual({ "wms.release.waves": 6, "agent.fleet.htm": 12 });
  });

  it("removes every override under a prefix", () => {
    const result = config.patchScenarioConfig(DRAFT_ID, { reset: ["wms"] });

    expect(result.overrides).toEqual({ "agent.fleet.htm": 12 });
  });

  it("leaves overrides outside the prefix alone", () => {
    const result = config.patchScenarioConfig(DRAFT_ID, { reset: ["wms.release"] });

    expect(result.overrides).toEqual({ "wms.volumeMultiplier": 2, "agent.fleet.htm": 12 });
  });

  it("runs before set in the same request", () => {
    const result = config.patchScenarioConfig(DRAFT_ID, {
      reset: ["wms"],
      set: { "wms.criticalPct": 20 },
    });

    expect(result.overrides).toEqual({ "agent.fleet.htm": 12, "wms.criticalPct": 20 });
  });

  it("rejects an unknown path", () => {
    const error = failure(DRAFT_ID, { reset: ["nope"] });
    expect(error).toMatchObject({
      status: 400,
      message: "Unknown config path: nope",
      details: { code: "CONFIG_INVALID" },
    });
    expect(error.details.problems).toEqual([
      {
        code: "UNKNOWN_PATH",
        message: "Unknown config path: nope",
        params: { path: "nope" },
        path: "nope",
      },
    ]);
  });
});

describe("patchScenarioConfig: rejected changes", () => {
  it("rejects an unknown path", () => {
    expect(problemCodes(failure(DRAFT_ID, { set: { "wms.nope": 1 } }))).toEqual([
      ["UNKNOWN_PATH", "wms.nope"],
    ]);
  });

  it("rejects a path that points at a group of values", () => {
    const error = failure(DRAFT_ID, { set: { wms: {} } });
    expect(error).toMatchObject({
      status: 400,
      message: "Can't set wms: it is not a single config value.",
    });
    expect(problemCodes(error)).toEqual([["NOT_A_SINGLE_VALUE", "wms"]]);
  });

  it("rejects an unsafe path", () => {
    expect(problemCodes(failure(DRAFT_ID, { set: { "wms.__proto__.x": 1 } }))).toEqual([
      ["UNKNOWN_PATH", "wms.__proto__.x"],
    ]);
  });

  it("rejects a value outside its range, with its path", () => {
    const error = failure(DRAFT_ID, { set: { "wms.volumeMultiplier": 6 } });
    expect(error).toMatchObject({ status: 400, details: { code: "CONFIG_INVALID" } });
    expect(error.details.problems).toEqual([
      expect.objectContaining({
        code: "INVALID_VALUE",
        path: "wms.volumeMultiplier",
        message: expect.stringContaining("wms.volumeMultiplier"),
      }),
    ]);
  });

  it("rejects a value of the wrong kind", () => {
    expect(problemCodes(failure(DRAFT_ID, { set: { "agent.charging.htm": "yes" } }))).toEqual([
      ["INVALID_VALUE", "agent.charging.htm"],
    ]);
  });

  it("rejects a schedule that does not fill the run, with the numbers", () => {
    const path = "station.stations.2.schedule";
    const error = failure(DRAFT_ID, {
      set: { [path]: [{ hours: 6, mode: "pick", teaBreaks: [] }] },
    });
    expect(error).toMatchObject({
      status: 400,
      message: "2: the schedule adds up to 6h, but the run is 8h.",
    });
    expect(error.details.problems).toEqual([
      {
        code: "SCHEDULE_TOTAL_MISMATCH",
        message: "2: the schedule adds up to 6h, but the run is 8h.",
        params: { stationId: "2", actualHours: 6, expectedHours: 8 },
        path,
      },
    ]);
  });

  it("rejects an unknown station in an All-stations list", () => {
    expect(
      problemCodes(failure(DRAFT_ID, { set: { "station.apply.schedule": ["PPS-999"] } })),
    ).toEqual([["UNKNOWN_STATION", "station.apply.schedule"]]);
  });

  it("lists every problem of a change, not just the first", () => {
    const error = failure(DRAFT_ID, {
      set: {
        "wms.nope": 1,
        wms: {},
        "station.stations.1.schedule": [{ hours: 3, mode: "pick", teaBreaks: [] }],
      },
    });
    // Path problems come first and stop the check; the value problems follow once they are fixed.
    expect(problemCodes(error)).toEqual([
      ["UNKNOWN_PATH", "wms.nope"],
      ["NOT_A_SINGLE_VALUE", "wms"],
    ]);
    expect(error.message).toBe("Unknown config path: wms.nope (and 1 more problem)");

    const values = failure(DRAFT_ID, {
      set: {
        "wms.volumeMultiplier": 6,
        "agent.fleet.htm": -1,
        "station.stations.1.schedule": [{ hours: 3, mode: "pick", teaBreaks: [] }],
      },
    });
    expect(problemCodes(values)).toEqual(
      expect.arrayContaining([
        ["INVALID_VALUE", "wms.volumeMultiplier"],
        ["INVALID_VALUE", "agent.fleet.htm"],
      ]),
    );
    expect(values.details.problems).toHaveLength(2);
  });

  it("lists every cross-field problem of a change at once", () => {
    const error = failure(DRAFT_ID, {
      set: {
        "wms.dataWindow.startHour": 12,
        "wms.dataWindow.endHour": 12,
        "station.stations.1.schedule": [{ hours: 3, mode: "pick", teaBreaks: [] }],
        "station.stations.2.schedule": [{ hours: 4, mode: "put", teaBreaks: [] }],
      },
    });
    expect(problemCodes(error)).toEqual([
      ["DATA_WINDOW_EMPTY", "wms.dataWindow"],
      ["SCHEDULE_TOTAL_MISMATCH", "station.stations.1.schedule"],
      ["SCHEDULE_TOTAL_MISMATCH", "station.stations.2.schedule"],
    ]);
  });

  it("changes nothing when one change in the request is invalid", () => {
    expect(
      failure(DRAFT_ID, { set: { "agent.fleet.htm": 12, "wms.volumeMultiplier": 6 } }),
    ).toMatchObject({ status: 400 });

    expect(config.getScenarioConfig(DRAFT_ID).overrides).toEqual({});
  });

  it("rejects an edit of a scenario that is not a draft, with its own code", () => {
    expect(failure(COMPLETED_ID, { set: { "agent.charging.htm": 20 } })).toMatchObject({
      status: 409,
      message: "Only draft scenarios can be edited.",
      details: { code: "SCENARIO_NOT_EDITABLE", params: { status: "completed" } },
    });
  });

  it("throws 404 for an unknown scenario", () => {
    expect(failure("nope", { set: { "agent.charging.htm": 20 } })).toMatchObject({ status: 404 });
  });
});
