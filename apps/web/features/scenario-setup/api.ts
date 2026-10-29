import { request } from "@/lib/api/client";

import { datasetRecordSchema, scenarioDetailSchema } from "./schema";
import type { DatasetProfile, DatasetRecord, DatasetSlot, ScenarioDetail } from "./types";

/** What the browser found when it read an uploaded file. */
export type UploadReport = {
  valid: boolean;
  issues: string[];
  profile: DatasetProfile;
};

/**
 * Fetches a scenario with its datasets (`GET /scenarios/{id}`).
 *
 * @param scenarioId - The scenario id.
 * @throws {ApiError} With status 404 if the scenario does not exist.
 */
export function getScenarioDetail(scenarioId: string): Promise<ScenarioDetail> {
  return request(`/scenarios/${encodeURIComponent(scenarioId)}`, scenarioDetailSchema);
}

/**
 * Uploads a file for one dataset (`POST /scenarios/{id}/datasets/{slot}`, multipart form).
 *
 * @param scenarioId - The scenario id.
 * @param slot - Which dataset the file is for.
 * @param file - The file the user chose.
 * @param report - The browser's validation result for the file.
 * @returns The stored dataset.
 */
export function uploadDataset(
  scenarioId: string,
  slot: DatasetSlot,
  file: File,
  report: UploadReport,
): Promise<DatasetRecord> {
  const form = new FormData();
  form.append("file", file);
  form.append("report", JSON.stringify(report));
  return request(
    `/scenarios/${encodeURIComponent(scenarioId)}/datasets/${slot}`,
    datasetRecordSchema,
    { method: "POST", body: form },
  );
}

/**
 * Attaches one of the built-in sample files to a dataset
 * (`PUT /scenarios/{id}/datasets/{slot}`).
 *
 * @param scenarioId - The scenario id.
 * @param slot - Which dataset to fill.
 * @param sampleId - Id of the sample file.
 * @returns The stored dataset.
 */
export function attachSample(
  scenarioId: string,
  slot: DatasetSlot,
  sampleId: string,
): Promise<DatasetRecord> {
  return request(
    `/scenarios/${encodeURIComponent(scenarioId)}/datasets/${slot}`,
    datasetRecordSchema,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sampleId }),
    },
  );
}
