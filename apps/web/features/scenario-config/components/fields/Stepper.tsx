"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { stepperStyles as styles } from "./Stepper.styles";
import { formatStepperValue, parseStepperInput, stepBy } from "./stepper-math";

type StepperProps = {
  /** Accessible name, such as "Volume multiplier". */
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Shown after the value, such as `%` or `h`. */
  unit?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
};

/**
 * A number with − and + buttons. The value can also be typed; it is read when the field
 * loses focus or Enter is pressed, snapped to the step and kept inside the range. Escape
 * puts the previous value back. Arrow keys inside the field step the value.
 *
 * @param label - Accessible name.
 * @param value - The current value.
 * @param min - Smallest value.
 * @param max - Largest value.
 * @param step - Size of one step (default 1).
 * @param unit - Text shown after the value.
 * @param disabled - Disables both buttons and the field.
 * @param onChange - Called with the new value.
 */
export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  disabled,
  onChange,
}: StepperProps): React.JSX.Element {
  const range = { min, max, step };
  // The text being typed; null while the field just shows the value.
  const [draft, setDraft] = useState<string | null>(null);

  function commit(): void {
    if (draft !== null) {
      const typed = parseStepperInput(draft, range);
      if (typed !== null && typed !== value) onChange(typed);
    }
    setDraft(null);
  }

  return (
    <div className={styles.root} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.button}
        aria-label={`Decrease ${label}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(stepBy(value, -1, range))}
      >
        <Minus className={styles.icon} aria-hidden="true" />
      </button>
      <div className={styles.valueWrap}>
        <input
          type="text"
          inputMode="decimal"
          className={styles.input}
          aria-label={label}
          size={String(max).length + 2}
          value={draft ?? formatStepperValue(value, step)}
          disabled={disabled}
          onFocus={(event) => event.target.select()}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            else if (event.key === "Escape") setDraft(null);
            else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              setDraft(null);
              onChange(stepBy(value, event.key === "ArrowUp" ? 1 : -1, range));
            }
          }}
        />
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      <button
        type="button"
        className={styles.button}
        aria-label={`Increase ${label}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(stepBy(value, 1, range))}
      >
        <Plus className={styles.icon} aria-hidden="true" />
      </button>
    </div>
  );
}
