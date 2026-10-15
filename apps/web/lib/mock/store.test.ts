import { beforeEach, describe, expect, it, vi } from "vitest";

type Store = typeof import("./store");

/** Loads a fresh copy of the store, so each test starts from the seed data. */
async function loadStore(): Promise<Store> {
  vi.resetModules();
  delete (globalThis as { mockScenarios?: unknown }).mockScenarios;
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
