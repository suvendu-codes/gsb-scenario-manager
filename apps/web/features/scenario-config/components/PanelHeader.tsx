import { ArrowLeft, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";

import { panelHeaderStyles as styles } from "./PanelHeader.styles";

type PanelHeaderProps = {
  title: string;
  description?: string;
  /** True when anything in the panel differs from the default. */
  customized: boolean;
  /** Called by the back arrow, which returns to the overview. */
  onBack: () => void;
  /** Puts everything in the panel back to its defaults. */
  onReset: () => void;
  /** Accessible name of the reset button, such as "Reset WMS (Order) to default". */
  resetLabel: string;
};

/**
 * The top of a module panel: a back arrow, the title, a "Customized" or "Default" badge, a
 * reset button that is only active while something is customized, and a short description.
 *
 * @param title - Name of the module or station.
 * @param description - One line about what the panel holds.
 * @param customized - Whether anything differs from the default.
 * @param onBack - Called when the back arrow is clicked.
 * @param onReset - Called when the reset button is clicked.
 * @param resetLabel - Accessible name of the reset button.
 */
export function PanelHeader({
  title,
  description,
  customized,
  onBack,
  onReset,
  resetLabel,
}: PanelHeaderProps): React.JSX.Element {
  return (
    <header className={styles.root}>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.back}
          aria-label="Back to overview"
          onClick={onBack}
        >
          <ArrowLeft className={styles.backIcon} aria-hidden="true" />
        </button>
        <h2 className={styles.title}>{title}</h2>
        <span
          className={cn(styles.badge, customized ? styles.badgeCustomized : styles.badgeDefault)}
        >
          {customized ? "Customized" : "Default"}
        </span>
        <button
          type="button"
          className={styles.reset}
          aria-label={resetLabel}
          disabled={!customized}
          onClick={onReset}
        >
          <RotateCcw className={styles.resetIcon} aria-hidden="true" />
        </button>
      </div>
      {description && <p className={styles.description}>{description}</p>}
    </header>
  );
}
