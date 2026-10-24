import { RotateCcw } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils";

import { fieldShellStyles as styles } from "./FieldShell.styles";

type FieldShellProps = {
  label: string;
  /** Help text shown under the label. */
  hint?: string;
  /** True when the value differs from its default: shows a dot and a reset button. */
  changed?: boolean;
  /** Puts the value back to its default. The reset button only shows when this is given. */
  onReset?: () => void;
  /** `inline` puts the control to the right of the label; `stacked` puts it underneath. */
  layout?: "inline" | "stacked";
  children: React.ReactNode;
};

/**
 * The frame around one setting: its label, help text, a dot and a reset button when the value
 * has been changed, and the control itself.
 *
 * @param label - Name of the setting.
 * @param hint - Help text.
 * @param changed - Whether the value differs from its default.
 * @param onReset - Called when the reset button is clicked.
 * @param layout - Where the control goes relative to the label.
 */
export function FieldShell({
  label,
  hint,
  changed,
  onReset,
  layout = "inline",
  children,
}: FieldShellProps): React.JSX.Element {
  const labelId = useId();

  return (
    <div
      className={cn(styles.root, layout === "inline" && styles.rootInline)}
      role="group"
      aria-labelledby={labelId}
    >
      <div className={styles.text}>
        <div className={styles.labelRow}>
          <span id={labelId} className={styles.label}>
            {label}
          </span>
          {changed && (
            <span className={styles.changedDot} role="img" aria-label="Changed from default" />
          )}
          {changed && onReset && (
            <button
              type="button"
              className={styles.reset}
              aria-label={`Reset ${label} to default`}
              onClick={onReset}
            >
              <RotateCcw className={styles.resetIcon} aria-hidden="true" />
            </button>
          )}
        </div>
        {hint && <span className={styles.hint}>{hint}</span>}
      </div>
      <div className={cn(styles.control, layout === "stacked" && styles.controlStacked)}>
        {children}
      </div>
    </div>
  );
}
