"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { ALL_STATIONS, type PanelSelection, type ReadyConfigEditor } from "../../panel";
import { stationTypes } from "../../station-types";
import { breakMarks, laneSegments } from "../../timeline/station-lane";
import {
  allExpanded,
  INITIAL_TIMELINE_VIEW,
  setFilter,
  toggleAll,
  toggleCompare,
  toggleExpanded,
  visibleTypes,
  type TimelineView,
} from "../../timeline/view-state";
import { formatHours, MODE_LABELS } from "../schedule/schedule-text";
import { isStationCustomized } from "../station/field-edits";
import { stationSelection, typeSelection } from "../station/station-view";
import { isTypeCustomized } from "../station/StationTypeList";
import { CompareTable } from "./CompareTable";
import { TimelineBlock } from "./TimelineBlock";
import { TimelineCard } from "./TimelineCard";
import { TimelineLane, TimelineRuler } from "./TimelineLane";
import { stationsCardStyles as styles } from "./StationsCard.styles";

type StationsCardProps = {
  editor: ReadyConfigEditor;
  selection: PanelSelection;
  onSelect: (selection: PanelSelection) => void;
};

/** What the station panel shows, if it is open: all stations, a type or a station. */
function openedInPanel(
  selection: PanelSelection,
): { kind: "all" | "type" | "station"; id: string } | null {
  if (selection.area !== "station") return null;
  if ("stationType" in selection) return { kind: "type", id: selection.stationType };
  return selection.station === ALL_STATIONS
    ? { kind: "all", id: "" }
    : { kind: "station", id: selection.station };
}

const LEGEND = [
  { label: "Pick", className: styles.legendPick },
  { label: "Put", className: styles.legendPut },
  { label: "Audit", className: styles.legendAudit },
  { label: "Break", className: styles.legendBreak },
  { label: "Tea break", className: styles.legendTea },
];

/**
 * The Stations & operators card: every station's mode blocks and breaks over the run, grouped
 * under its type. Types start collapsed; open one to see its stations, or filter to one type.
 * Any row opens its settings in the panel, and the row whose settings are open is highlighted.
 */
export function StationsCard({
  editor,
  selection,
  onSelect,
}: StationsCardProps): React.JSX.Element {
  const [view, setView] = useState<TimelineView>(INITIAL_TIMELINE_VIEW);
  const run = editor.runDurationHours;
  const types = stationTypes(editor.stations);
  const shown = visibleTypes(types, view.filter);
  const opened = openedInPanel(selection);
  const ids = editor.stations.map((station) => station.id);
  const shownIds = shown.map((type) => type.id);

  return (
    <TimelineCard
      title="Stations & operators"
      subtitle={`${ids.length} stations · ${types.length} types · click any row to configure`}
      selected={opened !== null}
      onOpen={() => onSelect({ area: "station", station: ALL_STATIONS })}
      actions={
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.expandAll}
            onClick={() => setView(toggleAll(view, shownIds))}
          >
            {allExpanded(view, shownIds) ? "Collapse all" : "Expand all"}
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={view.compare}
            className={styles.compare}
            onClick={() => setView(toggleCompare(view))}
          >
            Compare view
            <span className={styles.switchTrack} aria-hidden="true">
              <span className={styles.switchThumb} />
            </span>
          </button>
        </div>
      }
    >
      <div className={styles.toolbar}>
        <div className={styles.pills} role="group" aria-label="Show station types">
          {[
            { id: "all", label: "All stations", count: ids.length },
            ...types.map((t) => ({ id: t.id, label: t.label, count: t.stationIds.length })),
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              className={styles.pill}
              aria-pressed={view.filter === pill.id}
              onClick={() => setView(setFilter(view, pill.id))}
            >
              {pill.label}
              <span className={styles.pillCount}>{pill.count}</span>
            </button>
          ))}
        </div>
        <div className={styles.legend} aria-label="Legend">
          {LEGEND.map((item) => (
            <span key={item.label} className={styles.legendItem}>
              <i className={cn(styles.legendSwatch, item.className)} aria-hidden="true" />
              {item.label}
            </span>
          ))}
          <span className={styles.legendItem}>
            <i className={styles.dot} aria-hidden="true" />
            Modified
          </span>
          <span className={styles.legendTotal}>{formatHours(run)} total</span>
        </div>
      </div>

      <button
        type="button"
        className={cn(styles.allRow, opened?.kind === "all" && styles.rowSelected)}
        onClick={() => onSelect({ area: "station", station: ALL_STATIONS })}
      >
        <span className={styles.allLabel}>
          All stations <span className={styles.count}>×{ids.length}</span>
        </span>
        <span className={styles.configure}>Configure ›</span>
      </button>

      {ids.length === 0 ? (
        <p className={styles.empty}>The site registry lists no stations for this map.</p>
      ) : view.compare ? (
        <CompareTable
          editor={editor}
          types={shown}
          expanded={view.expanded}
          onToggle={(typeId) => setView(toggleExpanded(view, typeId))}
          onSelect={onSelect}
        />
      ) : (
        <>
          <TimelineRuler runHours={run} />

          {shown.map((type) => {
            const open = view.expanded.includes(type.id);
            return (
              <div key={type.id}>
                <div
                  className={cn(
                    styles.typeRow,
                    opened?.kind === "type" && opened.id === type.id && styles.rowSelected,
                  )}
                >
                  <button
                    type="button"
                    className={styles.chevron}
                    aria-expanded={open}
                    aria-label={`${open ? "Collapse" : "Expand"} ${type.label}`}
                    onClick={() => setView(toggleExpanded(view, type.id))}
                  >
                    {open ? (
                      <ChevronDown className={styles.chevronIcon} />
                    ) : (
                      <ChevronRight className={styles.chevronIcon} />
                    )}
                  </button>
                  <button
                    type="button"
                    className={styles.typeLabel}
                    onClick={() => onSelect(typeSelection(type.id))}
                  >
                    {type.label}
                    <span className={styles.count}>×{type.stationIds.length}</span>
                    {isTypeCustomized(editor, type) && (
                      <i
                        className={styles.dot}
                        role="img"
                        aria-label="A station of this type is modified"
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    className={styles.configure}
                    aria-label={`Configure ${type.label}`}
                    onClick={() => onSelect(typeSelection(type.id))}
                  >
                    Configure ›
                  </button>
                </div>
                {open &&
                  type.stationIds.map((id) => {
                    const station = editor.stations.find((candidate) => candidate.id === id);
                    const schedule = editor.config.station.stations[id].schedule;
                    const label = station?.label ?? id;
                    const select = () => onSelect(stationSelection(id));
                    return (
                      <div
                        key={id}
                        role="group"
                        aria-label={`${label}: ${
                          schedule.length === 0
                            ? "not assigned"
                            : schedule
                                .map((b) => `${MODE_LABELS[b.mode]} ${formatHours(b.hours)}`)
                                .join(", ")
                        }`}
                        className={cn(
                          styles.stationRow,
                          opened?.kind === "station" && opened.id === id && styles.rowSelected,
                        )}
                      >
                        <TimelineLane
                          runHours={run}
                          label={
                            <button type="button" className={styles.stationLabel} onClick={select}>
                              {label}
                              {isStationCustomized(
                                editor.config,
                                editor.overrides,
                                id,
                                type.stationIds,
                                editor.defaults,
                              ) && <i className={styles.dot} role="img" aria-label="Modified" />}
                            </button>
                          }
                        >
                          {schedule.length === 0 && (
                            <span className={styles.unassigned}>Not assigned</span>
                          )}
                          {laneSegments(schedule, run).map((segment, index) => (
                            <TimelineBlock
                              key={`${index}-${segment.mode}`}
                              tone={segment.mode}
                              leftPct={segment.leftPct}
                              widthPct={segment.widthPct}
                              label={MODE_LABELS[segment.mode]}
                              detail={formatHours(segment.hours)}
                              title={`${label}: ${MODE_LABELS[segment.mode]} for ${formatHours(segment.hours)}`}
                              onOpen={select}
                            />
                          ))}
                          {breakMarks(schedule, run, {
                            id,
                            index: ids.indexOf(id),
                            count: ids.length,
                          }).map((mark) => (
                            <i
                              key={`${mark.kind}-${mark.at}`}
                              aria-hidden="true"
                              className={cn(styles.mark, mark.kind === "tea" && styles.markTea)}
                              style={{ left: `${mark.leftPct}%`, width: `${mark.widthPct}%` }}
                              title={`${mark.kind === "tea" ? "Tea break" : "Break"}, ${Math.round(mark.duration * 60)} min`}
                            />
                          ))}
                        </TimelineLane>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </>
      )}
    </TimelineCard>
  );
}
