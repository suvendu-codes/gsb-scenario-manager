import { Select } from "@/components/ui/select";

import { ALL_STATIONS, type PanelSelection } from "../../panel";
import type { StationInfo } from "../../types";
import { stationPickerStyles as styles } from "./StationPicker.styles";

type StationPickerProps = {
  stations: StationInfo[];
  /** `ALL_STATIONS`, or the id of the station being edited. */
  value: string;
  /** A line under the list, such as which settings apply to every station. */
  note?: string;
  onSelect: (selection: PanelSelection) => void;
};

/**
 * Chooses what the station panel edits: all stations together, or one station.
 *
 * @param stations - The site's stations.
 * @param value - What is chosen now.
 * @param note - A line shown under the list.
 * @param onSelect - Called with the station panel selection the user picks.
 */
export function StationPicker({
  stations,
  value,
  note,
  onSelect,
}: StationPickerProps): React.JSX.Element {
  return (
    <div className={styles.root}>
      <Select
        aria-label="Station"
        className={styles.select}
        value={value}
        onChange={(event) => onSelect({ area: "station", station: event.target.value })}
      >
        <option value={ALL_STATIONS}>All stations · shared settings</option>
        {stations.map((station) => (
          <option key={station.id} value={station.id}>
            {station.id} · {station.type}
          </option>
        ))}
      </Select>
      {note && <p className={styles.note}>{note}</p>}
    </div>
  );
}
