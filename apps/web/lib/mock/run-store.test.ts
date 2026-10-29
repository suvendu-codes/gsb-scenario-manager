import { beforeEach, describe, expect, it, vi } from "vitest";

type RunStore = typeof import("./run-store");
type Store = typeof import("./store");
type ConfigStore = typeof import("./config-store");

const DRAFT_ID = "9b1f3c52-6a1e-4d0b-8f3a-1c2d3e4f5a06";
const COMPLETED_ID = "9b1f3c52-6a1e-4d0b-8f3a-1c2d3e4f5a01";
const T0 = Date.UTC(2026, 9, 28, 8, 0, 0);

let runs: RunStore;
let store: Store;
let config: ConfigStore;

beforeEach(async () => {
  vi.resetModules();
  for (const key of ["mockScenarios", "mockDatasets", "mockConfigs", "mockRuns"]) {
    delete (globalThis as Record<string, unknown>)[key];
  }
  runs = await import("./run-store");
  store = await import("./store");
  config = await import("./config-store");
});

/** Attaches the sample datasets the run needs, so the draft has no issues. */
function makeReady(id: string): void {
  store.attachSample(id, "inbound", "in-1");
  store.attachSample(id, "outbound", "out-1");
  store.attachSample(id, "masterdata", "md-1");
}

function failure(call: () => unknown): {
  status: number;
  details: { code?: string; problems?: Array<{ code: string }> };
} {
  try {
    call();
  } catch (error) {
    return error as never;
  }
  throw new Error("expected a failure");
}

describe("triggerRun", () => {
  it("refuses a scenario with issues, listing them", () => {
    const error = failure(() => runs.triggerRun(DRAFT_ID, null, "default", T0));
    expect(error.status).toBe(422);
    expect(error.details.code).toBe("scenario_invalid");
    expect(error.details.problems?.map((p) => p.code)).toContain("DATASET_MISSING_OR_INVALID");
  });

  it("refuses a scenario that is not a draft, and an unknown one", () => {
    expect(failure(() => runs.triggerRun(COMPLETED_ID, null, "default", T0))).toMatchObject({
      status: 409,
      details: { code: "scenario_not_triggerable" },
    });
    expect(failure(() => runs.triggerRun("nope", null, "default", T0)).status).toBe(404);
  });

  it("starts a run, makes the scenario active and locks its config", () => {
    makeReady(DRAFT_ID);
    const { run, created } = runs.triggerRun(DRAFT_ID, "key-1", "default", T0);

    expect(created).toBe(true);
    expect(run).toMatchObject({ scenarioId: DRAFT_ID, status: "queued", runId: null, attempt: 1 });
    expect(store.getScenarioDetail(DRAFT_ID).status).toBe("active");
    expect(
      failure(() => config.patchScenarioConfig(DRAFT_ID, { set: { "agent.fleet.htm": 5 } })).status,
    ).toBe(409);
  });

  it("returns the same run for a repeated idempotency key", () => {
    makeReady(DRAFT_ID);
    const first = runs.triggerRun(DRAFT_ID, "key-1", "default", T0);
    const again = runs.triggerRun(DRAFT_ID, "key-1", "default", T0 + 1000);
    expect(again.created).toBe(false);
    expect(again.run.correlationId).toBe(first.run.correlationId);
  });
});

describe("run state over time", () => {
  it("goes queued, accepted, running, completed", () => {
    makeReady(DRAFT_ID);
    const { run } = runs.triggerRun(DRAFT_ID, null, "default", T0);
    const at = (seconds: number) => runs.getRun(run.correlationId, T0 + seconds * 1000);

    expect(at(1).status).toBe("queued");
    expect(at(6)).toMatchObject({ status: "accepted", runId: expect.stringMatching(/^run-/) });
    expect(at(30).status).toBe("running");
    expect(at(600).status).toBe("completed");
    expect(runs.getScenarioRun(DRAFT_ID, T0 + 30_000).correlationId).toBe(run.correlationId);
  });

  it("has no run for a scenario that was not run", () => {
    expect(failure(() => runs.getScenarioRun(DRAFT_ID)).details.code).toBe("run_not_found");
    expect(failure(() => runs.getRun("nope")).status).toBe(404);
  });
});
