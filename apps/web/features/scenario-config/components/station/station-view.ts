import { ALL_STATIONS, type PanelSelection, type ReadyConfigEditor } from "../../panel";
import { editableStations, sharedStructureId } from "../../state/station-edits";
import type { CatalogSection } from "../../types";

/** What the station panel is showing and who it can talk to. */
export type StationView = {
  editor: ReadyConfigEditor;
  /** `ALL_STATIONS`, or the id of the station being edited. */
  station: string;
  isAll: boolean;
  /**
   * The station whose values the panel shows: the station itself, or in the All-stations view the
   * one the editable stations share.
   */
  referenceId: string;
  onSelect: (selection: PanelSelection) => void;
};

/** Draws a section whose body comes from somewhere other than the catalog's fields. */
export type StationSectionRenderer = (
  section: CatalogSection,
  view: StationView,
) => React.ReactNode;

/**
 * Works out what the station panel should show for a selection.
 *
 * @param editor - The loaded config editor.
 * @param selection - The panel selection; anything but a station means all stations.
 * @param onSelect - Called to open another station or leave the panel.
 */
export function buildStationView(
  editor: ReadyConfigEditor,
  selection: PanelSelection,
  onSelect: (selection: PanelSelection) => void,
): StationView {
  const station = selection.area === "station" ? selection.station : ALL_STATIONS;
  const isAll = station === ALL_STATIONS || !editor.catalog.stations.some((s) => s.id === station);
  const referenceId = isAll
    ? (sharedStructureId(editor.config) ??
      editableStations(editor.config, "structure")[0] ??
      editor.catalog.stations[0].id)
    : station;
  return { editor, station: isAll ? ALL_STATIONS : station, isAll, referenceId, onSelect };
}
