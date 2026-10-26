import { z } from "zod";

import { scenarioSchema } from "@/features/scenarios/schema";

/** The four datasets a scenario draws on. */
export const datasetSlotSchema = z.enum(["inbound", "outbound", "masterdata", "mockput"]);

/** Inventory of one SKU velocity class (Fast, Medium or Slow). */
export const velocityLevelSchema = z.object({
  label: z.string(),
  onHand: z.number(),
  capacity: z.number(),
});

/**
 * What the charts need from a dataset. Every field is optional because each
 * dataset type fills in only its own part.
 */
export const datasetProfileSchema = z.object({
  /** 24 values, one per hour: inbound units received, or outbound orders released. */
  hourly: z.array(z.number()).length(24).optional(),
  /** Outbound only: number of order lines and units in the whole file. */
  totalOrderlines: z.number().optional(),
  totalUnits: z.number().optional(),
  /** Master data only: on-hand versus capacity per velocity class. */
  velocity: z.array(velocityLevelSchema).optional(),
});

/** One dataset attached to a scenario, together with its validation result. */
export const datasetRecordSchema = z.object({
  slot: datasetSlotSchema,
  fileName: z.string(),
  /** `sample` for the built-in example files, `upload` for a file the user chose. */
  source: z.enum(["sample", "upload"]),
  sizeBytes: z.number().nullable(),
  uploadedAt: z.string(),
  valid: z.boolean(),
  /** Human-readable problems found in the file; empty when `valid`. */
  issues: z.array(z.string()),
  profile: datasetProfileSchema,
});

/** The datasets of a scenario, by slot (null where nothing is attached yet). */
export const scenarioDatasetsSchema = z.object({
  inbound: datasetRecordSchema.nullable(),
  outbound: datasetRecordSchema.nullable(),
  masterdata: datasetRecordSchema.nullable(),
  mockput: datasetRecordSchema.nullable(),
});

/** A scenario together with its datasets: the response of `GET /scenarios/{id}`. */
export const scenarioDetailSchema = scenarioSchema.extend({
  datasets: scenarioDatasetsSchema,
});

/**
 * The `report` field of `POST /scenarios/{id}/datasets/{slot}`: what the browser found when it
 * read the file. A real server would work this out itself from the uploaded file.
 */
export const uploadReportSchema = z.object({
  valid: z.boolean(),
  issues: z.array(z.string()),
  profile: datasetProfileSchema,
});

/** Body of `PUT /scenarios/{id}/datasets/{slot}`: attach one of the built-in sample files. */
export const attachSampleSchema = z.object({ sampleId: z.string().min(1) });
