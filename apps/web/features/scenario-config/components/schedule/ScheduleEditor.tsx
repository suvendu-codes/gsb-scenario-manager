"use client";

import { Copy } from "lucide-react";
import {
  copySchedule,
  followers,
  sharedBlocks,
  writeGroupSchedule,
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
import type { StationSectionRenderer, StationView } from "../station/station-view";
import { scheduleEditorStyles as styles } from "./ScheduleEditor.styles";
import { allowedModesFor } from "./allowed-modes";
import { ScheduleBlockCard } from "./ScheduleBlockCard";
import { MODE_LABELS, scheduleTotal } from "./schedule-text";

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
 * The schedule of one station, or of a station type's stations that share its schedule: up to
 * three blocks, each with its own mode (only modes the site registry allows), hours and breaks.
 * A type edit changes every station of the type that follows its shared schedule; a station
 * whose schedule then differs from most of its type keeps its own.
 *
 * @param view - The station panel's view.
 */
export function ScheduleEditor({ view }: { view: StationView }): React.JSX.Element | null {
  const { editor, isGroup, station, group } = view;
  const { config } = editor;
  const targets = isGroup ? followers(config, group, "schedule") : [station];
  const allowed = allowedModesFor(editor.stations, targets);

  const blocks = isGroup ? sharedBlocks(config, group) : config.station.stations[station].schedule;
  if (!blocks) return null;

  function write(next: ScheduleBlock[]): void {
    editor.edit((current) =>
      isGroup
        ? writeGroupSchedule(current, group, next)
        : writeStationSchedule(current, station, next),
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
        {!isGroup && group.length > 1 && (
          <button
            type="button"
            className={styles.copy}
            onClick={() => editor.edit((current) => copySchedule(current, station, group))}
          >
            <Copy className={styles.copyIcon} aria-hidden="true" />
            Copy to all {view.type?.label} stations
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
