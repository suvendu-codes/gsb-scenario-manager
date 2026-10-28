import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import type { PanelSelection, ReadyConfigEditor } from "../../panel";
import type { StationType } from "../../station-types";
import {
  COMPARE_COLUMNS,
  compareStationRow,
  compareTypeRow,
  type CompareCell,
  type CompareContext,
} from "../../timeline/compare";
import type { StationMode } from "../../types";
import { MODE_LABELS } from "../schedule/schedule-text";
import { stationSelection, typeSelection } from "../station/station-view";
import { compareTableStyles as styles } from "./CompareTable.styles";

type CompareTableProps = {
  editor: ReadyConfigEditor;
  types: StationType[];
  expanded: string[];
  onToggle: (typeId: string) => void;
  onSelect: (selection: PanelSelection) => void;
};

const MODE_TAG: Record<StationMode, string> = {
  pick: styles.tagPick,
  put: styles.tagPut,
  audit: styles.tagAudit,
};

function Cell({ cell, column }: { cell: CompareCell; column: string }): React.JSX.Element {
  if (cell.value === null) {
    return (
      <td className={cn(styles.cell, styles.none)} aria-label="Does not apply">
        —
      </td>
    );
  }
  if (column === "modes") {
    const modes =
      cell.value === "Mixed" ? null : (cell.value.split(",").filter(Boolean) as StationMode[]);
    return (
      <td className={styles.cell}>
        {modes === null
          ? "Mixed"
          : modes.length === 0
            ? "Not assigned"
            : modes.map((mode) => (
                <span key={mode} className={cn(styles.tag, MODE_TAG[mode])}>
                  {MODE_LABELS[mode]}
                </span>
              ))}
      </td>
    );
  }
  return (
    <td className={styles.cell}>
      {cell.value}
      {cell.customized && <i className={styles.dot} role="img" aria-label="Customized" />}
    </td>
  );
}

/**
 * The compare view of the Stations card: one row per type (the value its stations share, or
 * "Mixed"), expandable to one row per station, across the design's ten columns. A row's name
 * opens its settings in the panel.
 */
export function CompareTable({
  editor,
  types,
  expanded,
  onToggle,
  onSelect,
}: CompareTableProps): React.JSX.Element {
  const context: CompareContext = {
    config: editor.config,
    defaults: editor.defaults,
    catalog: editor.catalog,
    stations: editor.stations,
    runHours: editor.runDurationHours,
  };

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={cn(styles.head, styles.first)}>
              Station
            </th>
            {COMPARE_COLUMNS.map((column) => (
              <th key={column.id} scope="col" className={styles.head}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {types.map((type) => {
            const open = expanded.includes(type.id);
            return [
              <tr key={type.id} className={styles.typeRow}>
                <th scope="row" className={cn(styles.cell, styles.first)}>
                  <span className={styles.rowHead}>
                    <button
                      type="button"
                      className={styles.chevron}
                      aria-expanded={open}
                      aria-label={`${open ? "Collapse" : "Expand"} ${type.label}`}
                      onClick={() => onToggle(type.id)}
                    >
                      {open ? (
                        <ChevronDown className={styles.icon} />
                      ) : (
                        <ChevronRight className={styles.icon} />
                      )}
                    </button>
                    <button
                      type="button"
                      className={styles.name}
                      onClick={() => onSelect(typeSelection(type.id))}
                    >
                      {type.label}
                    </button>
                    <span className={styles.count}>×{type.stationIds.length}</span>
                  </span>
                </th>
                {compareTypeRow(context, type.stationIds).map((cell, i) => (
                  <Cell key={COMPARE_COLUMNS[i].id} cell={cell} column={COMPARE_COLUMNS[i].id} />
                ))}
              </tr>,
              ...(open
                ? type.stationIds.map((id) => (
                    <tr key={id} className={styles.stationRow}>
                      <th scope="row" className={cn(styles.cell, styles.first)}>
                        <button
                          type="button"
                          className={cn(styles.name, styles.stationName)}
                          onClick={() => onSelect(stationSelection(id))}
                        >
                          {editor.stations.find((station) => station.id === id)?.label ?? id}
                        </button>
                      </th>
                      {compareStationRow(context, id).map((cell, i) => (
                        <Cell
                          key={COMPARE_COLUMNS[i].id}
                          cell={cell}
                          column={COMPARE_COLUMNS[i].id}
                        />
                      ))}
                    </tr>
                  ))
                : []),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
