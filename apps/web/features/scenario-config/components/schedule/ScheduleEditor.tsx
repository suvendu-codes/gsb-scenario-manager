"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

import { Select } from "@/components/ui/select";

import {
  applyStationSchedule,
  applyTargets,
  copyScheduleToAll,
  editableStations,
  sharedBlocks,
  writeSharedSchedule,
  writeStationSchedule,
} from "../../state/station-edits";
import {
  blockStarts,
  maxBlockHours,
  removeBlock,
  resizeBlock,
  splitBlock,
} from "../../state/schedule-blocks";
import type { ScheduleBlock } from "../../types";
import { FieldShell } from "../fields/FieldShell";
import { listStations } from "../station/override-message";
import type { StationSectionRenderer, StationView } from "../station/station-view";
import { scheduleEditorStyles as styles } from "./ScheduleEditor.styles";
import { SchedulePeriod } from "./SchedulePeriod";
import { newTeaId, scheduleSummary, scheduleTotal } from "./schedule-text";

/**
 * What the All-stations view shows while the stations it reaches don't share one schedule:
 * a note, and a way to give them all the schedule of one station.
 */
function NoSharedSchedule({ view }: { view: StationView }): React.JSX.Element {
  const { editor } = view;
  const [source, setSource] = useState(view.referenceId);
  const stations = editor.catalog.stations;
  const targets = applyTargets(editor.config, "schedule");
  const reachesAll = targets.length === stations.length;

  return (
    <div className={styles.none}>
      <p className={styles.noneText}>
        These stations don’t share one schedule, so there is nothing to edit here yet. Apply one
        schedule, or open a station to change just that one.
      </p>
      <FieldShell label="Schedule to copy" layout="stacked">
        <Select
          aria-label="Schedule to copy"
          className={styles.select}
          value={source}
          onChange={(event) => setSource(event.target.value)}
        >
          {stations.map((station) => (
            <option key={station.id} value={station.id}>
              {station.id} · {scheduleSummary(editor.config.station.stations[station.id].schedule)}
            </option>
          ))}
        </Select>
      </FieldShell>
      <button
        type="button"
        className={styles.apply}
        onClick={() =>
          editor.edit((config) =>
            reachesAll
              ? copyScheduleToAll(config, source)
              : applyStationSchedule(config, source, targets),
          )
        }
      >
        {reachesAll ? "Apply to all stations" : `Apply to ${listStations(targets)}`}
      </button>
    </div>
  );
}

/**
 * The schedule of one station, or of all the stations an edit reaches when they share one: its
 * periods with their mode, length and tea breaks. Edits in the All-stations view change every
 * station that follows the shared schedule; editing one station marks it as keeping its own
 * unless the result matches the shared schedule again.
 *
 * @param view - The station panel's view.
 */
export function ScheduleEditor({ view }: { view: StationView }): React.JSX.Element {
  const { editor, isAll, station } = view;
  const { config } = editor;

  const blocks = isAll
    ? sharedBlocks(config, editableStations(config, "schedule"))
    : config.station.stations[station].schedule;
  if (!blocks) return <NoSharedSchedule view={view} />;

  const starts = blockStarts(blocks);

  function write(next: ScheduleBlock[]): void {
    editor.edit((current) =>
      isAll ? writeSharedSchedule(current, next) : writeStationSchedule(current, station, next),
    );
  }

  return (
    <div className={styles.root}>
      {blocks.map((block, index) => (
        <SchedulePeriod
          key={`${index}-${block.mode}`}
          block={block}
          index={index}
          start={starts[index]}
          maxHours={maxBlockHours(blocks, index)}
          canSplit={block.hours >= 1}
          canRemove={blocks.length > 1}
          onChange={(next) => write(blocks.map((b, i) => (i === index ? next : b)))}
          onResize={(hours) => write(resizeBlock(blocks, index, hours))}
          onSplit={() => write(splitBlock(blocks, index, newTeaId))}
          onRemove={() => write(removeBlock(blocks, index))}
        />
      ))}
      <div className={styles.footer}>
        <span className={styles.total}>{scheduleTotal(blocks)}</span>
        {!isAll && (
          <button
            type="button"
            className={styles.copy}
            onClick={() => editor.edit((current) => copyScheduleToAll(current, station))}
          >
            <Copy className={styles.copyIcon} aria-hidden="true" />
            Copy to all stations
          </button>
        )}
      </div>
    </div>
  );
}

/** Plugs the schedule editor into the station panel's `sectionRenderers` as `schedule`. */
export const renderScheduleSection: StationSectionRenderer = (_section, view) => (
  <ScheduleEditor view={view} />
);
