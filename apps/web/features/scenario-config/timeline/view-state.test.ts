import { describe, expect, it } from "vitest";

import { buildDefaults } from "@/lib/mock/defaults";

import { availability } from "./agent-lane";
import {
  allExpanded,
  INITIAL_TIMELINE_VIEW,
  setFilter,
  toggleAll,
  toggleCompare,
  toggleExpanded,
  visibleTypes,
} from "./view-state";

const types = [{ id: "manual" }, { id: "ppp_manual" }];

describe("timeline view state", () => {
  it("expands and collapses one type", () => {
    const open = toggleExpanded(INITIAL_TIMELINE_VIEW, "manual");
    expect(open.expanded).toEqual(["manual"]);
    expect(toggleExpanded(open, "manual").expanded).toEqual([]);
  });

  it("expands every type, then collapses them all", () => {
    const all = toggleAll(toggleExpanded(INITIAL_TIMELINE_VIEW, "manual"), [
      "manual",
      "ppp_manual",
    ]);
    expect(allExpanded(all, ["manual", "ppp_manual"])).toBe(true);
    expect(toggleAll(all, ["manual", "ppp_manual"]).expanded).toEqual([]);
    expect(allExpanded(INITIAL_TIMELINE_VIEW, [])).toBe(false);
  });

  it("filters to one type and switches to the compare table", () => {
    expect(visibleTypes(types, "all")).toEqual(types);
    expect(visibleTypes(types, setFilter(INITIAL_TIMELINE_VIEW, "ppp_manual").filter)).toEqual([
      { id: "ppp_manual" },
    ]);
    expect(toggleCompare(INITIAL_TIMELINE_VIEW).compare).toBe(true);
  });
});

describe("availability", () => {
  it("is the run less the outage share, with the fleet", () => {
    const agent = { ...buildDefaults().agent, botOutagePct: 5, fleet: { htm: 40, vtm: 12 } };
    expect(availability(agent)).toEqual({
      availablePct: 95,
      outagePct: 5,
      fleet: "40 HTM · 12 VTM",
      bots: 52,
    });
  });
});
