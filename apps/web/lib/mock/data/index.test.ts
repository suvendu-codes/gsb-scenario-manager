import { describe, expect, it } from "vitest";

import { fromSizer } from "@/features/scenario-config/upstream/fleet";
import { fromUpstreamPps } from "@/features/scenario-config/upstream/stations";

import { listProjects, listProjectMaps } from "../store";
import { MAP_FIXTURES } from ".";

const maps = listProjects().flatMap((project) => listProjectMaps(project.id));

describe("mock map fixtures", () => {
  it("has a fixture for every mock map", () => {
    expect(Object.keys(MAP_FIXTURES).sort()).toEqual(maps.map((map) => map.id).sort());
  });

  it.each(Object.entries(MAP_FIXTURES))("%s reads whole through the mappers", (_id, fixture) => {
    const stations = fromUpstreamPps(fixture.pps);
    const fleet = fromSizer(fixture.sizer);
    expect(stations?.stations.length).toBeGreaterThan(0);
    expect(stations?.skipped).toEqual([]);
    expect(fleet?.botTypes.length).toBeGreaterThan(0);
    expect(fleet?.skipped).toEqual([]);
  });
});
