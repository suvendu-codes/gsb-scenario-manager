import { describe, expect, it } from "vitest";

import { countByStatus, filterByStatus, groupScenarios, sortScenarios } from "./grouping";
import type { Project, ProjectMap, Scenario } from "./types";

function scenario(overrides: Partial<Scenario> & Pick<Scenario, "id">): Scenario {
  return {
    name: overrides.id,
    projectId: "p1",
    mapId: "m1",
    solutionId: null,
    status: "draft",
    authorId: "someone",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const projects: Project[] = [
  { id: "p1", name: "Alpha", description: "First project" },
  { id: "p2", name: "Beta", description: "" },
];

const mapsByProject: Record<string, ProjectMap[]> = {
  p1: [
    { id: "m1", projectId: "p1", name: "Map One", description: "" },
    { id: "m2", projectId: "p1", name: "Map Two", description: "" },
  ],
  p2: [{ id: "m3", projectId: "p2", name: "Map Three", description: "" }],
};

describe("countByStatus", () => {
  it("counts every scenario under all and each status", () => {
    const counts = countByStatus([
      scenario({ id: "a", status: "draft" }),
      scenario({ id: "b", status: "draft" }),
      scenario({ id: "c", status: "active" }),
      scenario({ id: "d", status: "completed" }),
    ]);
    expect(counts).toEqual({ all: 4, draft: 2, active: 1, completed: 1 });
  });

  it("returns zeros for an empty list", () => {
    expect(countByStatus([])).toEqual({ all: 0, draft: 0, active: 0, completed: 0 });
  });
});

describe("filterByStatus", () => {
  const list = [
    scenario({ id: "a", status: "draft" }),
    scenario({ id: "b", status: "active" }),
    scenario({ id: "c", status: "draft" }),
  ];

  it("keeps everything for all", () => {
    expect(filterByStatus(list, "all")).toHaveLength(3);
  });

  it("keeps only the matching status", () => {
    expect(filterByStatus(list, "draft").map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterByStatus(list, "completed")).toEqual([]);
  });
});

describe("sortScenarios", () => {
  const older = scenario({ id: "older", name: "Zulu", updatedAt: "2026-01-01T00:00:00.000Z" });
  const newer = scenario({ id: "newer", name: "Alpha", updatedAt: "2026-03-01T00:00:00.000Z" });
  const middle = scenario({ id: "middle", name: "Mike", updatedAt: "2026-02-01T00:00:00.000Z" });
  const list = [older, newer, middle];

  it("puts the most recently updated first for recent", () => {
    expect(sortScenarios(list, "recent").map((s) => s.id)).toEqual(["newer", "middle", "older"]);
  });

  it("puts the oldest first for oldest", () => {
    expect(sortScenarios(list, "oldest").map((s) => s.id)).toEqual(["older", "middle", "newer"]);
  });

  it("sorts by name A–Z for name", () => {
    expect(sortScenarios(list, "name").map((s) => s.name)).toEqual(["Alpha", "Mike", "Zulu"]);
  });

  it("does not change the list it was given", () => {
    sortScenarios(list, "name");
    expect(list.map((s) => s.id)).toEqual(["older", "newer", "middle"]);
  });
});

describe("groupScenarios", () => {
  const scenarios = [
    scenario({
      id: "a",
      name: "A",
      projectId: "p1",
      mapId: "m1",
      updatedAt: "2026-03-01T00:00:00.000Z",
    }),
    scenario({
      id: "b",
      name: "B",
      projectId: "p1",
      mapId: "m1",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }),
    scenario({
      id: "c",
      name: "C",
      projectId: "p1",
      mapId: "m2",
      updatedAt: "2026-02-01T00:00:00.000Z",
    }),
    scenario({
      id: "d",
      name: "D",
      projectId: "p2",
      mapId: "m3",
      updatedAt: "2026-04-01T00:00:00.000Z",
    }),
  ];

  it("groups by project, then by map, with names and totals", () => {
    const groups = groupScenarios(scenarios, projects, mapsByProject, "recent");

    expect(groups.map((g) => g.project.name)).toEqual(["Beta", "Alpha"]);
    const alpha = groups[1];
    expect(alpha.total).toBe(3);
    expect(alpha.maps.map((m) => [m.map.name, m.scenarios.length])).toEqual([
      ["Map One", 2],
      ["Map Two", 1],
    ]);
  });

  it("orders groups by their newest scenario for recent", () => {
    const groups = groupScenarios(scenarios, projects, mapsByProject, "recent");
    expect(groups.map((g) => g.project.id)).toEqual(["p2", "p1"]);
  });

  it("orders groups by their oldest scenario for oldest", () => {
    const groups = groupScenarios(scenarios, projects, mapsByProject, "oldest");
    expect(groups.map((g) => g.project.id)).toEqual(["p1", "p2"]);
    expect(groups[0].maps.map((m) => m.map.id)).toEqual(["m1", "m2"]);
  });

  it("orders projects, maps and scenarios by name for name", () => {
    const groups = groupScenarios(scenarios, projects, mapsByProject, "name");
    expect(groups.map((g) => g.project.name)).toEqual(["Alpha", "Beta"]);
    expect(groups[0].maps.map((m) => m.map.name)).toEqual(["Map One", "Map Two"]);
    expect(groups[0].maps[0].scenarios.map((s) => s.name)).toEqual(["A", "B"]);
  });

  it("drops projects and maps that have no scenarios", () => {
    const groups = groupScenarios([scenarios[2]], projects, mapsByProject, "recent");
    expect(groups).toHaveLength(1);
    expect(groups[0].maps.map((m) => m.map.id)).toEqual(["m2"]);
  });

  it("returns no groups when there are no scenarios", () => {
    expect(groupScenarios([], projects, mapsByProject, "recent")).toEqual([]);
  });

  it("falls back to ids when a project or map is not in the lookup lists", () => {
    const orphan = scenario({ id: "x", projectId: "ghost-project", mapId: "ghost-map" });
    const [group] = groupScenarios([orphan], [], {}, "recent");

    expect(group.project).toEqual({ id: "ghost-project", name: "ghost-project", description: "" });
    expect(group.maps[0].map).toEqual({ id: "ghost-map", name: "ghost-map" });
  });

  it("breaks ties between equal dates by name", () => {
    const sameDate = "2026-05-01T00:00:00.000Z";
    const tied = [
      scenario({ id: "1", projectId: "p2", mapId: "m3", updatedAt: sameDate }),
      scenario({ id: "2", projectId: "p1", mapId: "m1", updatedAt: sameDate }),
    ];
    const groups = groupScenarios(tied, projects, mapsByProject, "recent");
    expect(groups.map((g) => g.project.name)).toEqual(["Alpha", "Beta"]);
  });
});
