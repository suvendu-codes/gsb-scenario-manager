import { afterEach, describe, expect, it, vi } from "vitest";

import { mockApiFetch, resetMockApi } from "@/lib/mock/route-dispatch";

import { describeConfigApiContract, type ContractContext } from "./api-contract";

const DRAFT_ID = "9b1f3c52-6a1e-4d0b-8f3a-1c2d3e4f5a06";
const COMPLETED_ID = "9b1f3c52-6a1e-4d0b-8f3a-1c2d3e4f5a01";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

/** The client, imported after the mock is reset so it runs against fresh seed data. */
async function loadApi() {
  return (await import("./api")).configApi;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describeConfigApiContract("mock", async (): Promise<ContractContext> => {
  resetMockApi();
  vi.stubGlobal("fetch", mockApiFetch);
  return {
    api: await loadApi(),
    draftId: DRAFT_ID,
    nonDraftId: COMPLETED_ID,
    unknownId: UNKNOWN_ID,
    map: { projectId: "coupang-daegu", mapId: "ecom-rtp" },
    unknownMap: { projectId: "coupang-daegu", mapId: "no-such-map" },
  };
});

/*
 * The same contract against a running service. Set CONFIG_API_URL to its base URL (the value
 * NEXT_PUBLIC_API_BASE_URL would have), plus CONFIG_API_DRAFT_ID, CONFIG_API_NON_DRAFT_ID,
 * CONFIG_API_PROJECT_ID and CONFIG_API_MAP_ID.
 * The draft's overrides are reset before each test.
 */
const realUrl = process.env.CONFIG_API_URL;
describe.skipIf(!realUrl)("against CONFIG_API_URL", () => {
  describeConfigApiContract(realUrl ?? "real service", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", realUrl ?? "");
    return {
      api: await loadApi(),
      draftId: process.env.CONFIG_API_DRAFT_ID ?? "",
      nonDraftId: process.env.CONFIG_API_NON_DRAFT_ID ?? "",
      unknownId: UNKNOWN_ID,
      map: {
        projectId: process.env.CONFIG_API_PROJECT_ID ?? "",
        mapId: process.env.CONFIG_API_MAP_ID ?? "",
      },
      unknownMap: { projectId: process.env.CONFIG_API_PROJECT_ID ?? "", mapId: "no-such-map" },
    };
  });
});

describe("config API client: tolerance", () => {
  type Json = Record<string, unknown>;
  const EXTRA = { map_version: "v7", added_later: { nested: true } };

  /** The mock, with each response changed by `edit` on its way to the client. */
  function mockEditing(edit: (body: Json) => void): typeof fetch {
    return async (input, init) => {
      const response = await mockApiFetch(input, init);
      if (!response.ok) return response;
      const body = (await response.json()) as Json;
      edit(body);
      return Response.json(body, { status: response.status });
    };
  }

  it("reads a config with fields it does not know, at the top and inside modules", async () => {
    resetMockApi();
    vi.stubGlobal(
      "fetch",
      mockEditing((body) => {
        const defaults = body.defaults as Record<string, Json>;
        const station = defaults.station as { stations: Record<string, Json> };
        Object.assign(body, EXTRA);
        Object.assign(defaults.wms, EXTRA);
        Object.assign(defaults.agent, EXTRA);
        for (const config of Object.values(station.stations)) Object.assign(config, EXTRA);
      }),
    );
    const api = await loadApi();

    const config = await api.getScenarioConfig(DRAFT_ID);
    expect(config.scenarioId).toBe(DRAFT_ID);
    expect(config).not.toHaveProperty("map_version");
    expect(config.defaults.wms).not.toHaveProperty("map_version");
  });

  it("reads a catalog with fields it does not know", async () => {
    resetMockApi();
    vi.stubGlobal(
      "fetch",
      mockEditing((body) => {
        Object.assign(body, EXTRA);
        for (const entry of body.modules as Json[]) Object.assign(entry, EXTRA);
      }),
    );
    const api = await loadApi();

    expect((await api.getCatalog()).modules.length).toBeGreaterThan(0);
  });

  it("reads a config without updatedAt", async () => {
    resetMockApi();
    vi.stubGlobal(
      "fetch",
      mockEditing((body) => {
        delete body.updatedAt;
      }),
    );
    const api = await loadApi();

    expect((await api.getScenarioConfig(DRAFT_ID)).updatedAt).toBeUndefined();
  });
});
