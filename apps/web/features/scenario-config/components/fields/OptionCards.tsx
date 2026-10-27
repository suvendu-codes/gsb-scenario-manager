import { useId } from "react";

import { optionCardsStyles as styles } from "./OptionCards.styles";

/** One choice: the value stored, the text shown and an optional explanation. */
export type Choice = { value: string; label: string; note?: string };

type OptionCardsProps = {
  /** Accessible name of the group, such as "Order sequencing". */
  label: string;
  options: Choice[];
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

/**
 * A list of cards where exactly one can be chosen, each with a label and a short note. Built
 * on native radio buttons, so arrow keys and screen readers work as usual.
 *
 * @param label - Accessible name of the group.
 * @param options - The choices.
 * @param value - The value of the chosen option.
 * @param disabled - Disables every card.
 * @param onChange - Called with the value of the card the user picks.
 */
export function OptionCards({
  label,
  options,
  value,
  disabled,
  onChange,
}: OptionCardsProps): React.JSX.Element {
  const name = useId();

  return (
    <div className={styles.root} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <label key={option.value} className={styles.card}>
          <input
            type="radio"
            name={name}
            className={styles.input}
            value={option.value}
            checked={option.value === value}
            disabled={disabled}
            onChange={() => onChange(option.value)}
          />
          <span className={styles.radio} aria-hidden="true">
            <span className={styles.radioDot} />
          </span>
          <span className={styles.text}>
            <span className={styles.label}>{option.label}</span>
            {option.note && <span className={styles.note}>{option.note}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
