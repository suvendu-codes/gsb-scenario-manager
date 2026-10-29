import { ChevronRight } from "lucide-react";

import { DATASET_SLOTS } from "../constants";
import type { ScenarioDatasets } from "../types";
import type { ValidationResult } from "../validation";
import { validationErrorsStyles as styles } from "./ValidationErrors.styles";

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * The red card shown after validation fails: how many issues across how many files, and
 * a collapsible list of the issues for each file.
 *
 * @param result - The failed validation result.
 * @param datasets - The scenario's datasets, for file names.
 */
export function ValidationErrors({
  result,
  datasets,
}: {
  result: ValidationResult;
  datasets: ScenarioDatasets;
}): React.JSX.Element {
  return (
    <div className={styles.root} role="alert">
      <p className={styles.intro}>
        ✕ validation failed — {plural(result.issueCount, "issue")} across{" "}
        {plural(result.fileCount, "file")}
      </p>
      <p className={styles.note}>
        Fix the source data or pick a different dataset, then re-validate.
      </p>
      <div
        className={styles.list}
        tabIndex={0}
        role="region"
        aria-label="Validation issues by file"
      >
        {DATASET_SLOTS.map((slot) => {
          const issues = result.issues[slot.key];
          if (!issues) return null;
          return (
            <details key={slot.key} className={`group ${styles.item}`}>
              <summary className={styles.summary}>
                <span className={styles.summaryLabel}>
                  {slot.label} — {datasets[slot.key]?.fileName}
                </span>
                <span className={styles.summaryCount}>{plural(issues.length, "issue")}</span>
                <ChevronRight className={styles.chevron} aria-hidden="true" />
              </summary>
              <div className={styles.lines}>
                {issues.map((issue) => (
                  <p key={issue} className={styles.line}>
                    {issue}
                  </p>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
