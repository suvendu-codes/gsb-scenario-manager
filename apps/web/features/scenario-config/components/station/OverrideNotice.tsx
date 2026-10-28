import {
  keepingOwn,
  revertToShared,
  sharedScheduleFor,
  type StationSection,
} from "../../state/station-edits";
import { allowedModesFor } from "../schedule/allowed-modes";
import { MODE_LABELS } from "../schedule/schedule-text";
import { overrideNoticeStyles as styles } from "./OverrideNotice.styles";
import { stationNotice, typeNotice } from "./override-message";
import { stationSelection, type StationView } from "./station-view";

/**
 * Explains which stations keep their own value for a section. In a type's panel it names them
 * and offers to open each; in a station's panel it says type edits skip the station and offers
 * to take the type's value again ("Reset to shared settings"). Nothing is shown when no station
 * keeps its own value. A station can't take the type's schedule if it uses a mode the site
 * registry doesn't allow for that station; the note says so and the button is off.
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
  const { editor, group } = view;
  const own = keepingOwn(editor.config, group, section);
  const label = (id: string) => editor.stations.find((s) => s.id === id)?.label ?? id;

  if (view.kind === "type") {
    const text = typeNotice(section, own.map(label));
    if (!text) return null;
    return (
      <div className={styles.root}>
        <p className={styles.text}>{text}</p>
        <div className={styles.actions}>
          {own.map((id) => (
            <button
              key={id}
              type="button"
              className={styles.action}
              onClick={() => view.onSelect(stationSelection(id))}
            >
              Open {label(id)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view.kind !== "station" || !own.includes(view.station)) return null;

  // The type's schedule may use a mode this station can't run; then it can't take it.
  const allowed = allowedModesFor(editor.stations, [view.station]);
  const shared =
    section === "schedule" ? sharedScheduleFor(editor.config, group, view.station) : null;
  const blocked = shared?.find((block) => !allowed.includes(block.mode));
  return (
    <div className={styles.root}>
      <p className={styles.text}>{stationNotice(section, view.type?.label ?? "its type’s")}</p>
      {blocked && (
        <p className={styles.text}>
          It can’t take the type’s schedule: the site registry doesn’t allow{" "}
          {MODE_LABELS[blocked.mode]} here.
        </p>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.action}
          disabled={Boolean(blocked)}
          onClick={() =>
            editor.edit((config) => revertToShared(config, group, view.station, section))
          }
        >
          Reset to shared settings
        </button>
      </div>
    </div>
  );
}
