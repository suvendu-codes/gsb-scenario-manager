"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { DATASET_SLOTS } from "../constants";
import type { ScenarioDatasets } from "../types";
import type { SetupFlow } from "../use-setup-flow";
import { setupFooterStyles as styles } from "./SetupFooter.styles";

/**
 * The bar under the dataset cards: a progress dot per dataset, "N of 4 datasets added",
 * and on the right either a hint, the Validate button, the validating progress bar,
 * or "Validation failed".
 *
 * @param datasets - The scenario's datasets.
 * @param flow - The datasets step's state and actions.
 */
export function SetupFooter({
  datasets,
  flow,
}: {
  datasets: ScenarioDatasets;
  flow: SetupFlow;
}): React.JSX.Element {
  const addedCount = DATASET_SLOTS.filter((slot) => datasets[slot.key]).length;
  const failed = flow.result !== null && !flow.result.passed && flow.result.issueCount > 0;

  return (
    <div className={styles.root}>
      <div>
        <div className={styles.progress} aria-hidden="true">
          {DATASET_SLOTS.map((slot) => {
            const hasError = (flow.result?.issues[slot.key]?.length ?? 0) > 0;
            return (
              <div
                key={slot.key}
                className={cn(
                  styles.dot,
                  datasets[slot.key] && (hasError ? styles.dotError : styles.dotOn),
                )}
              />
            );
          })}
        </div>
        <div className={styles.note}>
          {addedCount} of {DATASET_SLOTS.length} datasets added
        </div>
      </div>

      {!flow.canValidate ? (
        <p className={styles.hint}>
          Add inbound, outbound &amp; master data
          <br />
          to validate
        </p>
      ) : flow.isValidating ? (
        <div className={styles.bar} role="status">
          <div className={styles.barTrack}>
            <div className={cn(styles.barFill, styles.barFillRunning)} />
          </div>
          <span className={cn(styles.barLabel, styles.barLabelRunning)}>
            Validating against site map…
          </span>
        </div>
      ) : failed ? (
        <div className={styles.bar}>
          <div className={styles.barTrack}>
            <div className={cn(styles.barFill, styles.barFillFailed)} />
          </div>
          <span className={cn(styles.barLabel, styles.barLabelFailed)}>✕ Validation failed</span>
        </div>
      ) : (
        <Button className={styles.validateButton} onClick={flow.validate}>
          Validate datasets →
        </Button>
      )}
    </div>
  );
}
