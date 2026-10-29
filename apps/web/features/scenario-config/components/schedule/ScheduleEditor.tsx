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
import { MAX_SCHEDULE_BLOCKS } from "../../schema";
import {
  blockStarts,
  canSplitBlock,
  changeBlockMode,
  freeModes,
  maxBlockHours,
  removeBlock,
  resizeBlock,
  splitBlock,
} from "../../state/schedule-blocks";
import type { ScheduleBlock, StationMode } from "../../types";
import { FieldShell } from "../fields/FieldShell";
import { listStations } from "../station/override-message";
import type { StationSectionRenderer, StationView } from "../station/station-view";
import { scheduleEditorStyles as styles } from "./ScheduleEditor.styles";
import { allowedModesFor } from "./allowed-modes";
import { ScheduleBlockCard } from "./ScheduleBlockCard";
import { MODE_LABELS, scheduleSummary, scheduleTotal } from "./schedule-text";

/**
 * What the All-stations view shows while the stations it reaches don't share one schedule:
 * a note, and a way to give them all the schedule of one station.
 */
function NoSharedSchedule({ view }: { view: StationView }): React.JSX.Element {
  const { editor } = view;
  const [source, setSource] = useState(view.referenceId);
  const stations = editor.stations;
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
              {station.label} ·{" "}
              {scheduleSummary(editor.config.station.stations[station.id].schedule)}
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

/** Why a block can't be split, for the disabled button's tooltip. */
function splitNote(blocks: ScheduleBlock[], i: number, allowed: readonly StationMode[]): string {
  if (blocks.length >= MAX_SCHEDULE_BLOCKS) return "Three blocks is the most.";
  if (freeModes(blocks, allowed).length === 0) return "No other mode is available.";
  if (blocks[i].hours < 1) return "A block needs at least an hour to split.";
  return "";
}

/** What a station with no blocks shows: that it is not assigned, and a way to assign it. */
function Unassigned({
  allowed,
  hours,
  onAssign,
}: {
  allowed: readonly StationMode[];
  hours: number;
  onAssign: (blocks: ScheduleBlock[]) => void;
}): React.JSX.Element {
  const [first] = allowed;
  return (
    <div className={styles.none}>
      <p className={styles.noneText}>
        {first
          ? "Not assigned to any mode, so it doesn’t work in this run."
          : "The site registry allows no mode here, so it can’t be scheduled."}
      </p>
      {first && (
        <button
          type="button"
          className={styles.apply}
          onClick={() => onAssign([{ hours, mode: first, breaks: [] }])}
        >
          Assign to {MODE_LABELS[first]}
        </button>
      )}
    </div>
  );
}

/**
 * The schedule of one station, or of all the stations an edit reaches when they share one: up
 * to three blocks, each with its own mode (only modes the site registry allows), hours and
 * breaks. Edits in the All-stations view change every station that follows the shared schedule;
 * editing one station marks it as keeping its own unless the result matches the shared schedule
 * again.
 *
 * @param view - The station panel's view.
 */
export function ScheduleEditor({ view }: { view: StationView }): React.JSX.Element {
  const { editor, isAll, station } = view;
  const { config } = editor;
  const targets = isAll ? editableStations(config, "schedule") : [station];
  const allowed = allowedModesFor(editor.stations, targets);

  const blocks = isAll ? sharedBlocks(config, targets) : config.station.stations[station].schedule;
  if (!blocks) return <NoSharedSchedule view={view} />;

  function write(next: ScheduleBlock[]): void {
    editor.edit((current) =>
      isAll ? writeSharedSchedule(current, next) : writeStationSchedule(current, station, next),
    );
  }

  if (blocks.length === 0) {
    return <Unassigned allowed={allowed} hours={editor.runDurationHours} onAssign={write} />;
  }

  const starts = blockStarts(blocks);
  return (
    <div className={styles.root}>
      {blocks.map((block, index) => (
        <ScheduleBlockCard
          key={`${index}-${block.mode}`}
          block={block}
          index={index}
          start={starts[index]}
          maxHours={maxBlockHours(blocks, index)}
          canResize={index < blocks.length - 1}
          modes={allowed.includes(block.mode) ? allowed : [block.mode, ...allowed]}
          canSplit={canSplitBlock(blocks, index, allowed)}
          splitNote={splitNote(blocks, index, allowed)}
          canRemove={blocks.length > 1}
          onChange={(next) => write(blocks.map((b, i) => (i === index ? next : b)))}
          onResize={(hours) => write(resizeBlock(blocks, index, hours))}
          onModeChange={(mode) => write(changeBlockMode(blocks, index, mode))}
          onSplit={() => write(splitBlock(blocks, index, allowed))}
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
