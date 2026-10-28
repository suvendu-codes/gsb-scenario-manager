import { maxTeaCount, maxTeaMinutes } from "../../validation";
import type { ScheduleBreak } from "../../types";
import { SegmentedControl } from "../fields/SegmentedControl";
import { Stepper } from "../fields/Stepper";
import { teaBreakEditorStyles as styles } from "./TeaBreakEditor.styles";

type TeaBreak = Extract<ScheduleBreak, { type: "tea" }>;

const PATTERNS = [
  { value: "staggered", label: "Staggered" },
  { value: "random", label: "Random" },
];

const PATTERN_HINTS: Record<TeaBreak["pattern"], string> = {
  staggered: "Stations pause at different times, so they don’t all stop together.",
  random: "Each station pauses at its own point in the block. The times stay put between edits.",
};

type TeaBreakEditorProps = {
  tea: TeaBreak;
  /** Its name in the block, such as "Tea break 1". */
  name: string;
  /** Length of the block the tea break is in. */
  blockHours: number;
  onChange: (tea: TeaBreak) => void;
  onRemove: () => void;
};

/**
 * One tea break of a schedule block: its length, how many times it happens in the block, and
 * its pattern. The count is kept to what the block can hold at that length.
 *
 * @param tea - The tea break.
 * @param name - Its name in the block.
 * @param blockHours - Length of the block.
 * @param onChange - Called with the edited tea break.
 * @param onRemove - Called when Remove is clicked.
 */
export function TeaBreakEditor({
  tea,
  name,
  blockHours,
  onChange,
  onRemove,
}: TeaBreakEditorProps): React.JSX.Element {
  const maxCount = maxTeaCount(blockHours, tea.durationMinutes);

  function patch(next: Partial<TeaBreak>): void {
    const merged = { ...tea, ...next };
    onChange({
      ...merged,
      count: Math.min(merged.count, maxTeaCount(blockHours, merged.durationMinutes)),
    });
  }

  return (
    <div className={styles.root} role="group" aria-label={name}>
      <div className={styles.head}>
        <span className={styles.title}>{name}</span>
        <span className={styles.note}>{tea.count} per block</span>
        <button
          type="button"
          className={styles.remove}
          aria-label={`Remove ${name}`}
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Length</span>
        <Stepper
          label={`${name}: length`}
          value={tea.durationMinutes}
          min={5}
          max={maxTeaMinutes(blockHours)}
          step={5}
          unit="min"
          onChange={(durationMinutes) => patch({ durationMinutes })}
        />
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Qty</span>
        <Stepper
          label={`${name}: quantity`}
          value={Math.min(tea.count, maxCount)}
          min={1}
          max={maxCount}
          onChange={(count) => patch({ count })}
        />
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Pattern</span>
        <SegmentedControl
          label={`${name}: pattern`}
          options={PATTERNS}
          value={tea.pattern}
          onChange={(pattern) => patch({ pattern: pattern as TeaBreak["pattern"] })}
        />
      </div>
      <p className={styles.patternHint}>{PATTERN_HINTS[tea.pattern]}</p>
    </div>
  );
}
