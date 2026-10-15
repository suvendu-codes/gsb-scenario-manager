"use client";

import { DATASET_SLOTS } from "../constants";
import type { SetupFlow } from "../use-setup-flow";
import type { ScenarioDatasets } from "../types";
import { DatasetCard } from "./DatasetCard";
import { datasetGridStyles as styles } from "./DatasetGrid.styles";

/**
 * The four dataset cards in a 2×2 grid (one column on narrow screens).
 *
 * @param datasets - The scenario's datasets.
 * @param flow - The datasets step's state and actions.
 */
export function DatasetGrid({
  datasets,
  flow,
}: {
  datasets: ScenarioDatasets;
  flow: SetupFlow;
}): React.JSX.Element {
  return (
    <div className={styles.root}>
      {DATASET_SLOTS.map((slot) => (
        <DatasetCard
          key={slot.key}
          slot={slot}
          record={datasets[slot.key]}
          issueCount={flow.result?.issues[slot.key]?.length ?? 0}
          busy={flow.busySlot === slot.key}
          error={flow.cardErrors[slot.key]}
          onChooseSample={(sampleId) => flow.chooseSample(slot.key, sampleId)}
          onUpload={(file) => flow.uploadFile(slot.key, file)}
        />
      ))}
    </div>
  );
}
