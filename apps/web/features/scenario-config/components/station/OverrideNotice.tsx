import {
  overriddenStations,
  revertStationSchedule,
  revertStationStructure,
  type StationSection,
} from "../../state/station-edits";
import { overrideNoticeStyles as styles } from "./OverrideNotice.styles";
import { allStationsNotice, stationNotice } from "./override-message";
import type { StationView } from "./station-view";

/**
 * Explains which stations keep their own value for a section. In the All-stations panel it names
 * them and offers to open each; in a station's panel it says the station is skipped by
 * All-stations edits and offers to make it follow the shared value again. Nothing is shown when
 * no station keeps its own value.
 *
 * @param section - `schedule` or `structure`.
 * @param view - The station panel's view.
 */
export function OverrideNotice({
  section,
  view,
}: {
  section: StationSection;
  view: StationView;
}): React.JSX.Element | null {
  const { editor } = view;
  const revert = section === "schedule" ? revertStationSchedule : revertStationStructure;

  if (view.isAll) {
    const ids = overriddenStations(editor.config, section);
    const text = allStationsNotice(section, ids);
    if (!text) return null;
    return (
      <div className={styles.root}>
        <p className={styles.text}>{text}</p>
        <div className={styles.actions}>
          {ids.map((id) => (
            <button
              key={id}
              type="button"
              className={styles.action}
              onClick={() => view.onSelect({ area: "station", station: id })}
            >
              Open {id}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!overriddenStations(editor.config, section).includes(view.station)) return null;
  const canRevert = revert(editor.config, view.station) !== null;
  return (
    <div className={styles.root}>
      <p className={styles.text}>{stationNotice(section)}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.action}
          disabled={!canRevert}
          onClick={() => editor.edit((config) => revert(config, view.station) ?? config)}
        >
          Use the shared {section}
        </button>
      </div>
    </div>
  );
}
