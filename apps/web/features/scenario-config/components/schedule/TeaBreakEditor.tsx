import { maxTeaCount } from "../../validation";
import { maxTeaMinutes } from "../../state/schedule-blocks";
import type { ScheduleBlock } from "../../types";
import { SegmentedControl } from "../fields/SegmentedControl";
import { Stepper } from "../fields/Stepper";
import { teaBreakEditorStyles as styles } from "./TeaBreakEditor.styles";

type TeaBreak = ScheduleBlock["teaBreaks"][number];

const PATTERNS = [
  { value: "staggered", label: "Staggered" },
  { value: "random", label: "Random" },
];

const PATTERN_HINTS: Record<TeaBreak["pattern"], string> = {
  staggered: "Stations pause at different times, so they don’t all stop together.",
  random: "Each station pauses at its own point in the period. The times stay put between edits.",
};

type TeaBreakEditorProps = {
  tea: TeaBreak;
  /** Position among the period's tea breaks, from 0. */
  index: number;
  /** How many tea breaks the period has. */
  total: number;
  /** Length of the period the tea break is in. */
  blockHours: number;
  onChange: (tea: TeaBreak) => void;
  onRemove: () => void;
};

/**
 * One tea break of a schedule period: how many times it happens, its pattern and its length.
 * The count is kept to what the period can hold at that length.
 *
 * @param tea - The tea break.
 * @param index - Its position among the period's tea breaks.
 * @param total - How many tea breaks the period has.
 * @param blockHours - Length of the period.
 * @param onChange - Called with the edited tea break.
 * @param onRemove - Called when Remove is clicked.
 */
export function TeaBreakEditor({
  tea,
  index,
  total,
  blockHours,
  onChange,
  onRemove,
}: TeaBreakEditorProps): React.JSX.Element {
  const name = total > 1 ? `Tea break ${index + 1}` : "Tea break";

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
        <button type="button" className={styles.remove} onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Times in this period</span>
        <Stepper
          label={`${name}: times in this period`}
          value={Math.min(tea.count, maxTeaCount(blockHours, tea.durationMinutes))}
          min={1}
          max={maxTeaCount(blockHours, tea.durationMinutes)}
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
    </div>
  );
}
