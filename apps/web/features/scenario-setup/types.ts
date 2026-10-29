import { z } from "zod";

import {
  datasetProfileSchema,
  datasetRecordSchema,
  datasetSlotSchema,
  scenarioDatasetsSchema,
  scenarioDetailSchema,
  velocityLevelSchema,
} from "./schema";

/** One of the four datasets: inbound, outbound, masterdata or mockput. */
export type DatasetSlot = z.infer<typeof datasetSlotSchema>;

/** On-hand versus capacity for one SKU velocity class. */
export type VelocityLevel = z.infer<typeof velocityLevelSchema>;

/** The numbers the charts draw from a dataset. */
export type DatasetProfile = z.infer<typeof datasetProfileSchema>;

/** A dataset attached to a scenario, with its validation result. */
export type DatasetRecord = z.infer<typeof datasetRecordSchema>;

/** The datasets of a scenario, by slot. */
export type ScenarioDatasets = z.infer<typeof scenarioDatasetsSchema>;

/** A scenario plus its datasets. */
export type ScenarioDetail = z.infer<typeof scenarioDetailSchema>;

/** Static description of one dataset slot, for the cards. */
export type DatasetSlotInfo = {
  key: DatasetSlot;
  label: string;
  description: string;
  required: boolean;
};

/** The CSV template for a slot: its column names and one example row. */
export type DatasetTemplate = {
  filename: string;
  columns: string[];
  exampleRow: string[];
};

/** A built-in example file offered in a card's dropdown. */
export type SampleDataset = {
  id: string;
  slot: DatasetSlot;
  fileName: string;
  valid: boolean;
  issues: string[];
  profile: DatasetProfile;
};
