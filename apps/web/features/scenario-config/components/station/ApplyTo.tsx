import { applyTargets, setSharedTargets, type StationSection } from "../../state/station-edits";
import { CheckChips } from "../fields/CheckChips";
import { applyToStyles as styles } from "./ApplyTo.styles";
import { listStations } from "./override-message";
import type { StationView } from "./station-view";

/**
 * Chooses which stations an edit made in the All-stations panel reaches, for the schedule or the
 * structure. All stations are chosen by default, and clearing every box means all again.
 *
 * @param section - `schedule` or `structure`.
 * @param view - The station panel's view.
 */
export function ApplyTo({
  section,
  view,
}: {
  section: StationSection;
  view: StationView;
}): React.JSX.Element {
  const { editor } = view;
  const stations = editor.catalog.stations;
  const targets = applyTargets(editor.config, section);
  const summary = targets.length === stations.length ? "All stations" : listStations(targets);

  return (
    <details className={styles.root}>
      <summary className={styles.summary}>
        <span className={styles.label}>Apply to</span>
        <span className={styles.value}>{summary}</span>
      </summary>
      <div className={styles.body}>
        <CheckChips
          label="Apply to"
          options={stations.map((station) => ({ value: station.id, label: station.id }))}
          value={targets}
          onChange={(ids) => editor.edit((config) => setSharedTargets(config, section, ids))}
        />
        <p className={styles.hint}>
          Changes made here reach the chosen stations, except any that keep their own {section}.
        </p>
      </div>
    </details>
  );
}
