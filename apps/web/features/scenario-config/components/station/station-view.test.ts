import { describe, expect, it } from "vitest";

import { buildDefaults } from "@/lib/mock/defaults";

import { ALL_STATIONS, type ReadyConfigEditor } from "../../panel";
import { buildStationView } from "./station-view";

/** Just what buildStationView reads from the editor. */
const editorWith = (config: ReturnType<typeof buildDefaults>) =>
  ({
    config,
    stations: Object.keys(config.station.stations).map((id) => ({ id, label: id })),
  }) as unknown as ReadyConfigEditor;

describe("buildStationView", () => {
  it("shows all stations for a map without stations, with no reference station", () => {
    const view = buildStationView(
      editorWith(buildDefaults([], [])),
      { area: "overview" },
      () => {},
    );
    expect(view).toMatchObject({ isAll: true, station: ALL_STATIONS, referenceId: "" });
  });

  it("falls back to all stations for an unknown station", () => {
    const view = buildStationView(
      editorWith(buildDefaults()),
      { area: "station", station: "nope" },
      () => {},
    );
    expect(view.isAll).toBe(true);
    expect(view.referenceId).toBe("PPS-101");
  });

  it("shows one station when it exists", () => {
    const view = buildStationView(
      editorWith(buildDefaults()),
      { area: "station", station: "PPS-103" },
      () => {},
    );
    expect(view).toMatchObject({ isAll: false, station: "PPS-103", referenceId: "PPS-103" });
  });
});
