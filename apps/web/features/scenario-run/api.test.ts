import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockApiFetch, resetMockApi } from "@/lib/mock/route-dispatch";

const DRAFT_ID = "9b1f3c52-6a1e-4d0b-8f3a-1c2d3e4f5a06";

beforeEach(() => {
  resetMockApi();
  vi.stubGlobal("fetch", mockApiFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runApi against the mock", () => {
  it("reads a 422 with the issues as problems", async () => {
    const { runApi } = await import("./api");
    const error = await runApi.trigger(DRAFT_ID, "k").catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 422, code: "scenario_invalid" });
    expect((error as { problems: unknown[] }).problems.length).toBeGreaterThan(0);
  });

  it("starts a run and reads it back as the scenario's run", async () => {
    const store = await import("@/lib/mock/store");
    store.attachSample(DRAFT_ID, "inbound", "in-1");
    store.attachSample(DRAFT_ID, "outbound", "out-1");
    store.attachSample(DRAFT_ID, "masterdata", "md-1");
    const { runApi } = await import("./api");

    const run = await runApi.trigger(DRAFT_ID, "k");
    expect(run.status).toBe("queued");
    expect((await runApi.getScenarioRun(DRAFT_ID)).correlationId).toBe(run.correlationId);
    expect(await runApi.trigger(DRAFT_ID, "k")).toMatchObject({ correlationId: run.correlationId });
  });

  it("answers 404 for a scenario that has not been run", async () => {
    const { runApi } = await import("./api");
    await expect(runApi.getScenarioRun(DRAFT_ID)).rejects.toMatchObject({ status: 404 });
  });
});
