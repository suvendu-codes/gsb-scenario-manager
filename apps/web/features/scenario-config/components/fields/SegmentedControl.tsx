import { useId } from "react";

import type { Choice } from "./OptionCards";
import { segmentedControlStyles as styles } from "./SegmentedControl.styles";

type SegmentedControlProps = {
  /** Accessible name of the control, such as "Front operation". */
  label: string;
  options: Pick<Choice, "value" | "label">[];
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

/**
 * A short row of segments where exactly one is chosen, for choices with brief labels such as
 * "Single-front" and "Dual-front". Built on native radio buttons.
 *
 * @param label - Accessible name of the control.
 * @param options - The segments.
 * @param value - The value of the chosen segment.
 * @param disabled - Disables every segment.
 * @param onChange - Called with the value of the segment the user picks.
 */
export function SegmentedControl({
  label,
  options,
  value,
  disabled,
  onChange,
}: SegmentedControlProps): React.JSX.Element {
  const name = useId();

  return (
    <div className={styles.root} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <label key={option.value} className={styles.segment}>
          <input
            type="radio"
            name={name}
            className={styles.input}
            value={option.value}
            checked={option.value === value}
            disabled={disabled}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
