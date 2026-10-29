import { ALL_STATIONS, type PanelSelection, type ReadyConfigEditor } from "../../panel";
import { stationTypes, typeOfStation, type StationType } from "../../station-types";
import { followers, sharedStructureId, stationIds } from "../../state/station-edits";
import type { CatalogSection } from "../../types";
import type { StationTabId } from "./station-tabs";

/** What the station panel is showing and who it can talk to. */
export type StationView = {
  editor: ReadyConfigEditor;
  /** Every station (site-wide settings), one station type, or one station. */
  kind: "all" | "type" | "station";
  /** True for a type: edits reach the type's stations that share its values. */
  isGroup: boolean;
  /** The id of the station being edited; empty unless `kind` is `station`. */
  station: string;
  /** The type shown, or the station's type; null for all stations. */
  type: StationType | null;
  /**
   * The stations whose shared value counts: the type's stations (for a station, its own type's).
   * A station whose value differs from what most of them have keeps its own.
   */
  group: string[];
  /** The station whose values the panel shows: the station, or one sharing the type's values. */
  referenceId: string;
  onSelect: (selection: PanelSelection) => void;
};

/** Draws a section whose body comes from somewhere other than the catalog's fields. */
export type StationSectionRenderer = (
  section: CatalogSection,
  view: StationView,
) => React.ReactNode;

/** The panel selection for a station type. */
export const typeSelection = (type: string, tab?: StationTabId): PanelSelection => ({
  area: "station",
  stationType: type,
  ...(tab && { tab }),
});

/** The panel selection for one station. */
export const stationSelection = (id: string): PanelSelection => ({ area: "station", station: id });

/**
 * Works out what the station panel should show for a selection. An unknown type or station
 * falls back to all stations.
 *
 * @param editor - The loaded config editor.
 * @param selection - The panel selection.
 * @param onSelect - Called to open another type or station, or leave the panel.
 */
export function buildStationView(
  editor: ReadyConfigEditor,
  selection: PanelSelection,
  onSelect: (selection: PanelSelection) => void,
): StationView {
  const types = stationTypes(editor.stations);
  const all = stationIds(editor.config);
  const base = { editor, onSelect };

  if (selection.area === "station" && "stationType" in selection) {
    const type = types.find((candidate) => candidate.id === selection.stationType);
    if (type) {
      const referenceId =
        sharedStructureId(editor.config, type.stationIds, editor.defaults) ?? type.stationIds[0];
      return {
        ...base,
        kind: "type",
        isGroup: true,
        station: "",
        type,
        group: type.stationIds,
        referenceId,
      };
    }
  }
  if (selection.area === "station" && "station" in selection && all.includes(selection.station)) {
    const type = typeOfStation(types, selection.station) ?? null;
    return {
      ...base,
      kind: "station",
      isGroup: false,
      station: selection.station,
      type,
      group: type?.stationIds ?? [selection.station],
      referenceId: selection.station,
    };
  }
  return {
    ...base,
    kind: "all",
    isGroup: false,
    station: "",
    type: null,
    group: all,
    referenceId:
      followers(editor.config, all, "structure", editor.defaults)[0] ?? all[0] ?? ALL_STATIONS,
  };
}
