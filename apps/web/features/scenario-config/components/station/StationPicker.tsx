import { Select } from "@/components/ui/select";

import { ALL_STATIONS, type PanelSelection } from "../../panel";
import type { StationType } from "../../station-types";
import type { MapStation } from "../../upstream/stations";
import { stationSelection, typeSelection } from "./station-view";
import { stationPickerStyles as styles } from "./StationPicker.styles";

const TYPE_PREFIX = "type:";

type StationPickerProps = {
  stations: MapStation[];
  types: StationType[];
  /** `ALL_STATIONS`, `type:<id>` for a type, or the id of a station. */
  value: string;
  note?: string;
  onSelect: (selection: PanelSelection) => void;
};

/** The picker value for a type. */
export const typeValue = (type: string): string => `${TYPE_PREFIX}${type}`;

/**
 * Chooses what the station panel shows: the settings for all stations, a station type (its
 * stations edited together), or one station, grouped under its type.
 *
 * @param stations - The scenario's stations.
 * @param types - The station types.
 * @param value - What is shown now.
 * @param note - A line under the picker.
 * @param onSelect - Called with the chosen selection.
 */
export function StationPicker({
  stations,
  types,
  value,
  note,
  onSelect,
}: StationPickerProps): React.JSX.Element {
  function choose(next: string): void {
    if (next === ALL_STATIONS) onSelect({ area: "station", station: ALL_STATIONS });
    else if (next.startsWith(TYPE_PREFIX)) onSelect(typeSelection(next.slice(TYPE_PREFIX.length)));
    else onSelect(stationSelection(next));
  }

  return (
    <div className={styles.root}>
      <Select
        aria-label="Station"
        className={styles.select}
        value={value}
        onChange={(event) => choose(event.target.value)}
      >
        <option value={ALL_STATIONS}>All station configs</option>
        {types.map((type) => (
          <optgroup key={type.id} label={type.label}>
            <option value={typeValue(type.id)}>
              All {type.label} · {type.stationIds.length} stations
            </option>
            {type.stationIds.map((id) => (
              <option key={id} value={id}>
                {stations.find((station) => station.id === id)?.label ?? id}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
      {note && <p className={styles.note}>{note}</p>}
    </div>
  );
}
