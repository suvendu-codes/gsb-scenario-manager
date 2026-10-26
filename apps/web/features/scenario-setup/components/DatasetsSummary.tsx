"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { DATASET_SLOTS } from "../constants";
import type { ScenarioDatasets } from "../types";
import type { SetupFlow } from "../use-setup-flow";
import { DatasetGrid } from "./DatasetGrid";
import { datasetsSummaryStyles as styles } from "./DatasetsSummary.styles";

/**
 * The collapsed "Datasets · 4 added · Validated" bar shown once validation passes.
 * Click it to open the dataset cards again; changing a file there starts validation over.
 *
 * @param datasets - The scenario's datasets.
 * @param flow - The datasets step's state and actions.
 */
export function DatasetsSummary({
  datasets,
  flow,
}: {
  datasets: ScenarioDatasets;
  flow: SetupFlow;
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const addedCount = DATASET_SLOTS.filter((slot) => datasets[slot.key]).length;

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.head}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={styles.label}>
          Datasets<span className={styles.count}>{addedCount} added</span>
        </span>
        <span className={styles.bar}>
          <span className={styles.barTrack} aria-hidden="true">
            <span className={styles.barFill} />
          </span>
          <span className={styles.barLabel}>Validated</span>
        </span>
        <ChevronRight
          className={cn(styles.chevron, isOpen && styles.chevronOpen)}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div className={styles.body}>
          <DatasetGrid datasets={datasets} flow={flow} />
        </div>
      )}
    </div>
  );
}
