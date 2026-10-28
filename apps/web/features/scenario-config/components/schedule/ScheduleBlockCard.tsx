import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { MAX_BREAKS_PER_BLOCK } from "../../schema";
import { addBreak, removeBreak, updateBreak } from "../../state/schedule-blocks";
import type { ScheduleBlock, ScheduleBreak, StationMode } from "../../types";
import { Stepper } from "../fields/Stepper";
import { RegularBreakEditor } from "./RegularBreakEditor";
import { MODE_LABELS, formatRange, newBreakId } from "./schedule-text";
import { scheduleBlockCardStyles as styles } from "./ScheduleBlockCard.styles";
import { TeaBreakEditor } from "./TeaBreakEditor";

const DOT: Record<StationMode, string> = {
  pick: styles.dotPick,
  put: styles.dotPut,
  audit: styles.dotAudit,
};

type ScheduleBlockCardProps = {
  block: ScheduleBlock;
  /** Position in the schedule, from 0. */
  index: number;
  /** Hour the block starts at. */
  start: number;
  /** The longest the block can be made; its length can't change when it is the last block. */
  maxHours: number;
  canResize: boolean;
  /** The modes the block can take (a mode another block has is swapped with it). */
  modes: readonly StationMode[];
  canSplit: boolean;
  /** Why the block can't be split, shown on the disabled button. */
  splitNote: string;
  canRemove: boolean;
  onChange: (block: ScheduleBlock) => void;
  onResize: (hours: number) => void;
  onModeChange: (mode: StationMode) => void;
  onSplit: () => void;
  onRemove: () => void;
};

/** "Break 1", "Tea break 2": breaks are numbered within their own kind. */
function breakNames(breaks: ScheduleBreak[]): string[] {
  const seen = { break: 0, tea: 0 };
  return breaks.map((item) => {
    seen[item.type] += 1;
    return `${item.type === "tea" ? "Tea break" : "Break"} ${seen[item.type]}`;
  });
}

/**
 * One block of a station's schedule, as the design's block card: its hours, its mode, its
 * regular and tea breaks, and buttons to split it (adding a block for a free mode) or remove it
 * (the station stops working in that mode). The last block's hours are what the others leave.
 *
 * @param block - The block.
 * @param index - Its position in the schedule.
 * @param start - The hour it starts at.
 * @param maxHours - The longest it can be made.
 * @param canResize - Whether its hours can change.
 * @param modes - The modes it can take.
 * @param canSplit - Whether it can be split.
 * @param splitNote - Why it can't be split.
 * @param canRemove - Whether it can be removed (a station keeps at least one block).
 * @param onChange - Called with the block after a break change.
 * @param onResize - Called with the wanted hours.
 * @param onModeChange - Called with the chosen mode.
 * @param onSplit - Called when Split is clicked.
 * @param onRemove - Called when Remove is clicked.
 */
export function ScheduleBlockCard({
  block,
  index,
  start,
  maxHours,
  canResize,
  modes,
  canSplit,
  splitNote,
  canRemove,
  onChange,
  onResize,
  onModeChange,
  onSplit,
  onRemove,
}: ScheduleBlockCardProps): React.JSX.Element {
  const label = `Block ${index + 1}`;
  const names = breakNames(block.breaks);
  const full = block.breaks.length >= MAX_BREAKS_PER_BLOCK;

  return (
    <div className={styles.root} role="group" aria-label={`${label}: ${MODE_LABELS[block.mode]}`}>
      <div className={styles.head}>
        <span className={cn(styles.dot, DOT[block.mode])} aria-hidden="true" />
        <span className={styles.title}>{label}</span>
        <span className={styles.range}>{formatRange(start, block.hours)}</span>
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Hours</span>
        <Stepper
          label={`${label}: hours`}
          value={block.hours}
          min={0.5}
          max={Math.max(maxHours, block.hours)}
          step={0.5}
          unit="h"
          disabled={!canResize}
          onChange={onResize}
        />
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Mode</span>
        <Select
          aria-label={`${label}: mode`}
          className={styles.select}
          value={block.mode}
          onChange={(event) => onModeChange(event.target.value as StationMode)}
        >
          {modes.map((mode) => (
            <option key={mode} value={mode}>
              {MODE_LABELS[mode]}
            </option>
          ))}
        </Select>
      </div>

      <div className={styles.breaks}>
        <p className={styles.breaksHead}>
          Breaks <span className={styles.breaksCount}>{block.breaks.length} scheduled</span>
        </p>
        {block.breaks.map((item, i) =>
          item.type === "break" ? (
            <RegularBreakEditor
              key={item.id}
              item={item}
              name={names[i]}
              blockHours={block.hours}
              onChange={(next) => onChange(updateBreak(block, next))}
              onRemove={() => onChange(removeBreak(block, item.id))}
            />
          ) : (
            <TeaBreakEditor
              key={item.id}
              tea={item}
              name={names[i]}
              blockHours={block.hours}
              onChange={(next) => onChange(updateBreak(block, next))}
              onRemove={() => onChange(removeBreak(block, item.id))}
            />
          ),
        )}
        <div className={styles.addRow}>
          <button
            type="button"
            className={styles.add}
            disabled={full}
            onClick={() => onChange(addBreak(block, "break", newBreakId()))}
          >
            + Add break
          </button>
          <button
            type="button"
            className={styles.add}
            disabled={full}
            onClick={() => onChange(addBreak(block, "tea", newBreakId()))}
          >
            + Add tea break
          </button>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.action}
          disabled={!canSplit}
          title={canSplit ? undefined : splitNote}
          onClick={onSplit}
        >
          Split this block
        </button>
        <button
          type="button"
          className={cn(styles.action, styles.danger)}
          disabled={!canRemove}
          title={
            canRemove
              ? `Also stops the station working in ${MODE_LABELS[block.mode]}`
              : "A station needs at least one block"
          }
          onClick={onRemove}
        >
          Remove block
        </button>
      </div>
    </div>
  );
}
