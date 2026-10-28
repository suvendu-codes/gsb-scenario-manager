import { Check } from "lucide-react";

import { checkChipsStyles as styles } from "./CheckChips.styles";
import type { Choice } from "./OptionCards";

type CheckChipsProps = {
  /** Accessible name of the group, such as "Order types". */
  label: string;
  options: Pick<Choice, "value" | "label">[];
  /** The values that are checked. */
  value: string[];
  disabled?: boolean;
  /** How many must stay checked. */
  minSelected?: number;
  onChange: (value: string[]) => void;
};

/**
 * A grid of check boxes shown as chips, for choosing any number of options. The new list keeps
 * the options' own order, whichever was clicked last.
 *
 * @param label - Accessible name of the group.
 * @param options - The choices.
 * @param value - The checked values.
 * @param disabled - Disables every chip.
 * @param minSelected - How many must stay checked; the last checked chips can't be unchecked.
 * @param onChange - Called with the new list of checked values.
 */
export function CheckChips({
  label,
  options,
  value,
  disabled,
  minSelected = 0,
  onChange,
}: CheckChipsProps): React.JSX.Element {
  const atMinimum = value.length <= minSelected;
  function toggle(optionValue: string): void {
    const checked = new Set(value);
    if (checked.has(optionValue)) checked.delete(optionValue);
    else checked.add(optionValue);
    onChange(options.filter((option) => checked.has(option.value)).map((option) => option.value));
  }

  return (
    <div className={styles.root} role="group" aria-label={label}>
      {options.map((option) => (
        <label key={option.value} className={styles.chip}>
          <input
            type="checkbox"
            className={styles.input}
            checked={value.includes(option.value)}
            disabled={disabled || (atMinimum && value.includes(option.value))}
            onChange={() => toggle(option.value)}
          />
          <span className={styles.box} aria-hidden="true">
            <Check className={styles.tick} strokeWidth={3} />
          </span>
          {option.label}
        </label>
      ))}
    </div>
  );
}
