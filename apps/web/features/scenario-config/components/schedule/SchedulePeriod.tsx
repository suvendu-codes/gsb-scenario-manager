import { Split, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { newTeaBreak } from "../../state/schedule-blocks";
import { STATION_MODES } from "../../schema";
import type { ScheduleBlock } from "../../types";
import { SegmentedControl } from "../fields/SegmentedControl";
import { Stepper } from "../fields/Stepper";
import { MODE_LABELS, formatRange, newTeaId } from "./schedule-text";
import { schedulePeriodStyles as styles } from "./SchedulePeriod.styles";
import { TeaBreakEditor } from "./TeaBreakEditor";

const MODE_OPTIONS = STATION_MODES.map((mode) => ({ value: mode, label: MODE_LABELS[mode] }));

const DOT: Record<ScheduleBlock["mode"], string> = {
  pick: styles.dotPick,
  put: styles.dotPut,
  audit: styles.dotAudit,
  off: styles.dotOff,
};

type SchedulePeriodProps = {
  block: ScheduleBlock;
  /** Position in the schedule, from 0. */
  index: number;
  /** Hour the period starts at. */
  start: number;
  /** The longest the period can be made. */
  maxHours: number;
  canSplit: boolean;
  canRemove: boolean;
  onChange: (block: ScheduleBlock) => void;
  onResize: (hours: number) => void;
  onSplit: () => void;
  onRemove: () => void;
};

/**
 * One period of a station's schedule: its mode, its length, and its tea breaks. Splitting
 * halves it; removing gives its time to a neighbour. Changing the length takes or gives time to
 * the neighbour, so the schedule keeps filling the run.
 *
 * @param block - The period.
 * @param index - Its position in the schedule.
 * @param start - The hour it starts at.
 * @param maxHours - The longest it can be made.
 * @param canSplit - Whether it is long enough to split.
 * @param canRemove - Whether there is another period to take its time.
 * @param onChange - Called with the period after a mode or tea break change.
 * @param onResize - Called with the wanted length when the stepper changes.
 * @param onSplit - Called when Split is clicked.
 * @param onRemove - Called when Remove is clicked.
 */
export function SchedulePeriod({
  block,
  index,
  start,
  maxHours,
  canSplit,
  canRemove,
  onChange,
  onResize,
  onSplit,
  onRemove,
}: SchedulePeriodProps): React.JSX.Element {
  const label = `Period ${index + 1}`;

  return (
    <div className={styles.root} role="group" aria-label={`${label}: ${MODE_LABELS[block.mode]}`}>
      <div className={styles.head}>
        <span className={cn(styles.dot, DOT[block.mode])} aria-hidden="true" />
        <span className={styles.title}>{MODE_LABELS[block.mode]}</span>
        <span className={styles.range}>{formatRange(start, block.hours)}</span>
        <button
          type="button"
          className={styles.action}
          aria-label={`Split ${label}`}
          disabled={!canSplit}
          onClick={onSplit}
        >
          <Split className={styles.actionIcon} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.action}
          aria-label={`Remove ${label}`}
          disabled={!canRemove}
          onClick={onRemove}
        >
          <Trash2 className={styles.actionIcon} aria-hidden="true" />
        </button>
      </div>

      <SegmentedControl
        label={`${label}: mode`}
        options={MODE_OPTIONS}
        value={block.mode}
        onChange={(mode) => onChange({ ...block, mode: mode as ScheduleBlock["mode"] })}
      />

      <div className={styles.row}>
        <span className={styles.rowLabel}>Length</span>
        <Stepper
          label={`${label}: length`}
          value={block.hours}
          min={0.5}
          max={Math.max(maxHours, block.hours)}
          step={0.5}
          unit="h"
          disabled={!canRemove}
          onChange={onResize}
        />
      </div>

      <div className={styles.tea}>
        {block.teaBreaks.map((tea, teaIndex) => (
          <TeaBreakEditor
            key={tea.id}
            tea={tea}
            index={teaIndex}
            total={block.teaBreaks.length}
            blockHours={block.hours}
            onChange={(next) =>
              onChange({
                ...block,
                teaBreaks: block.teaBreaks.map((t) => (t.id === tea.id ? next : t)),
              })
            }
            onRemove={() =>
              onChange({ ...block, teaBreaks: block.teaBreaks.filter((t) => t.id !== tea.id) })
            }
          />
        ))}
        <button
          type="button"
          className={styles.addTea}
          onClick={() =>
            onChange({ ...block, teaBreaks: [...block.teaBreaks, newTeaBreak(newTeaId())] })
          }
        >
          Add tea break
        </button>
      </div>
    </div>
  );
}
