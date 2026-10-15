import { beforeEach, describe, expect, it, vi } from "vitest";

type Store = typeof import("./store");

/** Loads a fresh copy of the store, so each test starts from the seed data. */
async function loadStore(): Promise<Store> {
  vi.resetModules();
  delete (globalThis as { mockScenarios?: unknown }).mockScenarios;
  delete (globalThis as { mockDatasets?: unknown }).mockDatasets;
  return import("./store");
}

let store: Store;

beforeEach(async () => {
  store = await loadStore();
});

describe("listScenarios", () => {
  it("returns the seed scenarios newest update first", () => {
    const list = store.listScenarios();

    expect(list.length).toBeGreaterThan(0);
    const dates = list.map((s) => s.updatedAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe("projects and maps", () => {
  it("lists the projects", () => {
    const ids = store.listProjects().map((p) => p.id);

    expect(ids).toContain("coupang-daegu");
    expect(ids).toContain("hm-canada");
  });

  it("lists only the maps of the given project", () => {
    const maps = store.listProjectMaps("coupang-daegu");

    expect(maps.map((m) => m.id)).toEqual(["ecom-rtp", "multi-msio"]);
    expect(maps.every((m) => m.projectId === "coupang-daegu")).toBe(true);
  });

  it("returns no maps for an unknown project", () => {
    expect(store.listProjectMaps("nope")).toEqual([]);
  });
});

describe("createScenario", () => {
  const input = { projectId: "hm-canada", mapId: "relay-coexist", name: "Brand New" };

  it("creates a draft scenario and adds it to the list", () => {
    const before = store.listScenarios().length;

    const created = store.createScenario(input);

    expect(created).toMatchObject({
      name: "Brand New",
      projectId: "hm-canada",
      mapId: "relay-coexist",
      status: "draft",
      solutionId: null,
    });
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBe(created.updatedAt);
    expect(store.listScenarios()).toHaveLength(before + 1);
    expect(store.listScenarios()[0].id).toBe(created.id);
  });

  it("gives each scenario its own id", () => {
    const first = store.createScenario(input);
    const second = store.createScenario({ ...input, name: "Another" });

    expect(first.id).not.toBe(second.id);
  });

  it("rejects a duplicate name on the same map with a 409", () => {
    store.createScenario(input);

    expect(() => store.createScenario(input)).toThrowError(
      expect.objectContaining({ status: 409, message: expect.stringContaining("already exists") }),
    );
  });

  it("compares names ignoring case", () => {
    store.createScenario(input);

    expect(() => store.createScenario({ ...input, name: "brand new" })).toThrowError(
      expect.objectContaining({ status: 409 }),
    );
  });

  it("allows the same name on a different map", () => {
    store.createScenario({ projectId: "coupang-daegu", mapId: "ecom-rtp", name: "Shared Name" });

    expect(() =>
      store.createScenario({
        projectId: "coupang-daegu",
        mapId: "multi-msio",
        name: "Shared Name",
      }),
    ).not.toThrow();
  });

  it("rejects a map that is not in the project with a 404", () => {
    expect(() =>
      store.createScenario({ projectId: "hm-canada", mapId: "ecom-rtp", name: "Mismatch" }),
    ).toThrowError(expect.objectContaining({ status: 404 }));
  });

  it("rejects an unknown project or map with a 404", () => {
    expect(() =>
      store.createScenario({ projectId: "nope", mapId: "nope", name: "Ghost" }),
    ).toThrowError(expect.objectContaining({ status: 404 }));
  });

  it("does not add anything to the list when creating fails", () => {
    const before = store.listScenarios().length;

    expect(() =>
      store.createScenario({ projectId: "nope", mapId: "nope", name: "Ghost" }),
    ).toThrow();

    expect(store.listScenarios()).toHaveLength(before);
  });

  it("throws a MockApiError", () => {
    expect(() =>
      store.createScenario({ projectId: "nope", mapId: "nope", name: "Ghost" }),
    ).toThrowError(expect.objectContaining({ name: "MockApiError" }));
  });
});

describe("getScenarioDetail", () => {
  it("returns the scenario with empty datasets", () => {
    const created = store.createScenario({
      projectId: "hm-canada",
      mapId: "relay-coexist",
      name: "Detail Test",
    });

    const detail = store.getScenarioDetail(created.id);

    expect(detail).toMatchObject({ id: created.id, name: "Detail Test" });
    expect(detail.datasets).toEqual({
      inbound: null,
      outbound: null,
      masterdata: null,
      mockput: null,
    });
  });

  it("throws a 404 for an unknown scenario", () => {
    expect(() => store.getScenarioDetail("nope")).toThrowError(
      expect.objectContaining({ status: 404 }),
    );
  });
});

describe("updateScenario", () => {
  const input = { projectId: "hm-canada", mapId: "relay-coexist" };
  const draft = () => store.createScenario({ ...input, name: "Original" });

  it("changes a draft's name, project and map and bumps updatedAt", () => {
    const created = draft();

    const updated = store.updateScenario(created.id, {
      projectId: "coupang-daegu",
      mapId: "ecom-rtp",
      name: "Renamed",
    });

    expect(updated).toMatchObject({
      id: created.id,
      name: "Renamed",
      projectId: "coupang-daegu",
      mapId: "ecom-rtp",
      status: "draft",
    });
    expect(updated.updatedAt >= created.updatedAt).toBe(true);
  });

  it("lets a scenario keep its own name", () => {
    const created = draft();

    expect(() => store.updateScenario(created.id, { ...input, name: "Original" })).not.toThrow();
  });

  it("rejects a name another scenario already uses on the map with a 409", () => {
    const created = draft();
    store.createScenario({ ...input, name: "Taken" });

    expect(() => store.updateScenario(created.id, { ...input, name: "taken" })).toThrowError(
      expect.objectContaining({ status: 409 }),
    );
  });

  it("rejects editing a scenario that is not a draft with a 409", () => {
    const completed = store.listScenarios().find((s) => s.status === "completed")!;

    expect(() =>
      store.updateScenario(completed.id, {
        projectId: completed.projectId,
        mapId: completed.mapId,
        name: "New name",
      }),
    ).toThrowError(
      expect.objectContaining({ status: 409, message: "Only draft scenarios can be edited." }),
    );
  });

  it("rejects an unknown scenario and a map outside the project with a 404", () => {
    const created = draft();

    expect(() => store.updateScenario("nope", { ...input, name: "x" })).toThrowError(
      expect.objectContaining({ status: 404 }),
    );
    expect(() =>
      store.updateScenario(created.id, { projectId: "hm-canada", mapId: "ecom-rtp", name: "x" }),
    ).toThrowError(expect.objectContaining({ status: 404 }));
  });
});

describe("datasets", () => {
  const scenarioInput = { projectId: "hm-canada", mapId: "relay-coexist" };

  it("attaches a sample file and shows it in the scenario detail", () => {
    const created = store.createScenario({ ...scenarioInput, name: "With data" });

    const record = store.attachSample(created.id, "inbound", "in-1");

    expect(record).toMatchObject({
      slot: "inbound",
      fileName: "RDC_Inbound_Receipts.csv",
      source: "sample",
      valid: true,
      issues: [],
    });
    expect(store.getScenarioDetail(created.id).datasets.inbound).toEqual(record);
  });

  it("keeps the problems of an invalid sample file", () => {
    const created = store.createScenario({ ...scenarioInput, name: "Bad data" });

    const record = store.attachSample(created.id, "masterdata", "md-2");

    expect(record.valid).toBe(false);
    expect(record.issues.length).toBeGreaterThan(0);
  });

  it("rejects an unknown sample, or one that belongs to another dataset, with a 400", () => {
    const created = store.createScenario({ ...scenarioInput, name: "Wrong sample" });

    expect(() => store.attachSample(created.id, "inbound", "nope")).toThrowError(
      expect.objectContaining({ status: 400 }),
    );
    expect(() => store.attachSample(created.id, "inbound", "out-1")).toThrowError(
      expect.objectContaining({ status: 400 }),
    );
  });

  it("replaces the file in a slot and updates the scenario's last-updated time", () => {
    const created = store.createScenario({ ...scenarioInput, name: "Replace" });
    store.attachSample(created.id, "outbound", "out-1");

    store.attachSample(created.id, "outbound", "out-2");

    const detail = store.getScenarioDetail(created.id);
    expect(detail.datasets.outbound?.fileName).toBe("Legacy_P2P_Orders.csv");
    expect(detail.updatedAt >= created.updatedAt).toBe(true);
  });

  it("stores an uploaded dataset exactly as given", () => {
    const created = store.createScenario({ ...scenarioInput, name: "Upload" });
    const record = {
      slot: "mockput" as const,
      fileName: "mine.csv",
      source: "upload" as const,
      sizeBytes: 123,
      uploadedAt: "2026-10-15T10:00:00.000Z",
      valid: true,
      issues: [],
      profile: {},
    };

    expect(store.attachDataset(created.id, record)).toEqual(record);
    expect(store.getScenarioDetail(created.id).datasets.mockput).toEqual(record);
  });

  it("throws a 404 when the scenario does not exist", () => {
    expect(() => store.attachSample("nope", "inbound", "in-1")).toThrowError(
      expect.objectContaining({ status: 404 }),
    );
  });
});
