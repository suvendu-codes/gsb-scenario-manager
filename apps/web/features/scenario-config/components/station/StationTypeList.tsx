import { ChevronRight } from "lucide-react";

import type { ReadyConfigEditor, PanelSelection } from "../../panel";
import type { StationType } from "../../station-types";
import { isCustomized } from "../../state/customized";
import { keepingOwn } from "../../state/station-edits";
import { typeSelection } from "./station-view";
import { stationTypeListStyles as styles } from "./StationTypeList.styles";

/** True when a type's stations differ from the defaults, or some keep their own values. */
export function isTypeCustomized(editor: ReadyConfigEditor, type: StationType): boolean {
  return (
    type.stationIds.some((id) => isCustomized(editor.overrides, `station.stations.${id}`)) ||
    keepingOwn(editor.config, type.stationIds, "schedule", editor.defaults).length > 0 ||
    keepingOwn(editor.config, type.stationIds, "structure", editor.defaults).length > 0
  );
}

/**
 * The station types, each with its number of stations, a dot when it is customized, and a
 * button to open it. Modes, schedule, setup and operations are set per type.
 *
 * @param editor - The loaded config editor.
 * @param types - The station types.
 * @param onSelect - Called with the type to open.
 */
export function StationTypeList({
  editor,
  types,
  onSelect,
}: {
  editor: ReadyConfigEditor;
  types: StationType[];
  onSelect: (selection: PanelSelection) => void;
}): React.JSX.Element {
  return (
    <section className={styles.root} aria-label="Station types">
      <h3 className={styles.title}>Station types</h3>
      <p className={styles.description}>
        Modes, schedule, setup and operations are set once per type. Open a type to change its
        stations together, or one of its stations on its own.
      </p>
      <ul className={styles.list}>
        {types.map((type) => (
          <li key={type.id} className={styles.row}>
            <span className={styles.label}>{type.label}</span>
            <span className={styles.count}>×{type.stationIds.length}</span>
            {isTypeCustomized(editor, type) && (
              <span className={styles.dot} role="img" aria-label="Customized" />
            )}
            <button
              type="button"
              className={styles.open}
              aria-label={`Configure ${type.label}`}
              onClick={() => onSelect(typeSelection(type.id))}
            >
              Configure
              <ChevronRight className={styles.openIcon} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
