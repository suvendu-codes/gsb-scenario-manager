import { describe, expect, it } from "vitest";

import casePickSizer from "@/lib/mock/data/sizer/case-pick.json";

import { fromSizer, type MapFleet } from "./fleet";

function read(body: unknown): MapFleet {
  const result = fromSizer(body);
  if (!result) throw new Error("expected a bot type list");
  return result;
}

describe("fromSizer", () => {
  it("reads the API design's answer, with the fleet key of each type", () => {
    expect(read(casePickSizer)).toEqual({
      mapId: "<map_id>",
      mapVersion: null,
      botTypes: [
        {
          type: "quicktron_htm",
          fleetKey: "htm",
          label: "Quicktron HTM",
          imageUrl: null,
          count: 10,
        },
        {
          type: "quicktron_vtm",
          fleetKey: "vtm",
          label: "Quicktron VTM",
          imageUrl: null,
          count: 10,
        },
      ],
      skipped: [],
    });
  });

  it("accepts a bare list, a map version and fields it does not know", () => {
    expect(read([{ type: "quicktron_htm", count: 3, speed: 2 }]).botTypes[0]).toEqual({
      type: "quicktron_htm",
      fleetKey: "htm",
      label: "quicktron_htm",
      imageUrl: null,
      count: 3,
    });
    expect(read({ map_version: "v2", bot_types: [] }).mapVersion).toBe("v2");
  });

  it("keeps a bot type it has no fleet key for under its own type", () => {
    expect(read([{ type: "sorter_bot", count: 4 }]).botTypes[0].fleetKey).toBe("sorter_bot");
  });

  it("skips entries it cannot use and says why", () => {
    const result = read([
      { count: 2 },
      { type: "a_htm", count: -1 },
      { type: "b_htm", count: 1.5 },
      { type: "c_htm", count: "4" },
      { type: "d_vtm", count: 0 },
      { type: "d_vtm", count: 1 },
    ]);
    expect(result.botTypes.map((bot) => bot.type)).toEqual(["d_vtm"]);
    expect(result.skipped.map((entry) => entry.index)).toEqual([0, 1, 2, 3, 5]);
  });

  it("skips a second type with the same fleet key, so each key appears once", () => {
    const result = read([
      { type: "quicktron_htm", count: 10 },
      { type: "geek_htm", count: 4 },
      { type: "quicktron_vtm", count: 2 },
    ]);
    expect(result.botTypes.map((bot) => [bot.type, bot.fleetKey, bot.count])).toEqual([
      ["quicktron_htm", "htm", 10],
      ["quicktron_vtm", "vtm", 2],
    ]);
    expect(result.skipped).toEqual([
      { index: 1, reason: 'type "geek_htm" has the same fleet key ("htm") as "quicktron_htm"' },
    ]);
  });

  it("returns null when there is no bot type list", () => {
    expect(fromSizer({ map_id: "m" })).toBeNull();
    expect(fromSizer(undefined)).toBeNull();
  });
});
