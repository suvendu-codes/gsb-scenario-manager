import { cn } from "@/lib/utils";

import { toggleStyles as styles } from "./Toggle.styles";

type ToggleProps = {
  /** Accessible name, such as "Error injection". */
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

/**
 * An on/off switch.
 *
 * @param label - Accessible name.
 * @param checked - Whether the switch is on.
 * @param disabled - Disables the switch.
 * @param onChange - Called with the new state when it is clicked.
 */
export function Toggle({ label, checked, disabled, onChange }: ToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      className={cn("group", styles.root)}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.thumb} aria-hidden="true" />
    </button>
  );
}
