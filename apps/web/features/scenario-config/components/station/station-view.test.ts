import { describe, expect, it } from "vitest";

import { buildDefaults } from "@/lib/mock/defaults";

import type { ReadyConfigEditor } from "../../panel";
import type { MapStation } from "../../upstream/stations";
import { buildStationView, stationSelection, typeSelection } from "./station-view";

/** Just what buildStationView reads from the editor. */
const editorWith = (config: ReturnType<typeof buildDefaults>, type = "manual") =>
  ({
    config,
    stations: Object.keys(config.station.stations).map(
      (id) => ({ id, label: id, registryType: type }) as MapStation,
    ),
  }) as unknown as ReadyConfigEditor;

describe("buildStationView", () => {
  it("shows all stations for a map without stations, without throwing", () => {
    const view = buildStationView(
      editorWith(buildDefaults([], [])),
      { area: "overview" },
      () => {},
    );
    expect(view).toMatchObject({ kind: "all", group: [], station: "" });
  });

  it("falls back to all stations for an unknown station or type", () => {
    const editor = editorWith(buildDefaults());
    expect(buildStationView(editor, stationSelection("nope"), () => {}).kind).toBe("all");
    expect(buildStationView(editor, typeSelection("nope"), () => {}).kind).toBe("all");
  });

  it("shows a type with its stations, and a station with its type as its group", () => {
    const editor = editorWith(buildDefaults());
    const type = buildStationView(editor, typeSelection("manual"), () => {});
    expect(type).toMatchObject({
      kind: "type",
      isGroup: true,
      group: editor.stations.map((s) => s.id),
    });
    const one = buildStationView(editor, stationSelection("PPS-103"), () => {});
    expect(one).toMatchObject({ kind: "station", station: "PPS-103", referenceId: "PPS-103" });
    expect(one.group).toHaveLength(6);
  });
});
