import { breakOccurrences, HALF_HOUR } from "../../state/schedule-blocks";
import type { ScheduleBreak } from "../../types";
import { Stepper } from "../fields/Stepper";
import { teaBreakEditorStyles as styles } from "./TeaBreakEditor.styles";

type RegularBreak = Extract<ScheduleBreak, { type: "break" }>;

type RegularBreakEditorProps = {
  item: RegularBreak;
  /** Its name in the block, such as "Break 1". */
  name: string;
  /** Length of the block the break is in. */
  blockHours: number;
  onChange: (item: RegularBreak) => void;
  onRemove: () => void;
};

/**
 * One regular break of a schedule block: how often it comes and how long it lasts, with how
 * many times that makes it happen in the block.
 *
 * @param item - The break.
 * @param name - Its name in the block.
 * @param blockHours - Length of the block.
 * @param onChange - Called with the edited break.
 * @param onRemove - Called when Remove is clicked.
 */
export function RegularBreakEditor({
  item,
  name,
  blockHours,
  onChange,
  onRemove,
}: RegularBreakEditorProps): React.JSX.Element {
  const times = breakOccurrences(item.everyHours, blockHours);

  return (
    <div className={styles.root} role="group" aria-label={name}>
      <div className={styles.head}>
        <span className={styles.title}>{name}</span>
        <span className={styles.note}>
          {times} {times === 1 ? "occurrence" : "occurrences"} in this block
        </span>
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
        <span className={styles.rowLabel}>Every</span>
        <Stepper
          label={`${name}: every`}
          value={item.everyHours}
          min={HALF_HOUR}
          max={Math.max(HALF_HOUR, blockHours)}
          step={HALF_HOUR}
          unit="h"
          onChange={(everyHours) => onChange({ ...item, everyHours })}
        />
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>For</span>
        <Stepper
          label={`${name}: for`}
          value={item.durationHours}
          min={0.25}
          max={2}
          step={0.25}
          unit="h"
          onChange={(durationHours) => onChange({ ...item, durationHours })}
        />
      </div>
    </div>
  );
}
