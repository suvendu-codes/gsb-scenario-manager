"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { scenarioKeys } from "@/features/scenarios/hooks";

import { attachSample, getScenarioDetail, uploadDataset, type UploadReport } from "./api";
import type { DatasetRecord, DatasetSlot, ScenarioDetail } from "./types";

/**
 * Loads a scenario with its datasets.
 *
 * @param scenarioId - The scenario id.
 * @returns The query result for the scenario detail.
 */
export function useScenarioDetail(scenarioId: string): UseQueryResult<ScenarioDetail, Error> {
  return useQuery({
    queryKey: scenarioKeys.detail(scenarioId),
    queryFn: () => getScenarioDetail(scenarioId),
  });
}

/**
 * Returns a function that puts a saved dataset into the cached scenario detail and refreshes
 * the scenario list (a dataset change updates the scenario's "last updated" time).
 */
function useStoreDataset(scenarioId: string): (record: DatasetRecord) => Promise<void> {
  const queryClient = useQueryClient();

  return async (record) => {
    queryClient.setQueryData<ScenarioDetail>(scenarioKeys.detail(scenarioId), (detail) =>
      detail ? { ...detail, datasets: { ...detail.datasets, [record.slot]: record } } : detail,
    );
    await queryClient.invalidateQueries({ queryKey: scenarioKeys.list });
  };
}

/** Input of the upload mutation. */
export type UploadInput = { slot: DatasetSlot; file: File; report: UploadReport };

/**
 * Uploads a file for one dataset and stores the result in the cached scenario.
 *
 * @param scenarioId - The scenario id.
 * @returns The mutation result; call `mutateAsync` with the slot, file and report.
 */
export function useUploadDataset(
  scenarioId: string,
): UseMutationResult<DatasetRecord, Error, UploadInput> {
  const storeDataset = useStoreDataset(scenarioId);

  return useMutation({
    mutationFn: ({ slot, file, report }: UploadInput) =>
      uploadDataset(scenarioId, slot, file, report),
    onSuccess: storeDataset,
  });
}

/** Input of the attach-sample mutation. */
export type AttachSampleInput = { slot: DatasetSlot; sampleId: string };

/**
 * Attaches a built-in sample file to a dataset and stores the result in the cached scenario.
 *
 * @param scenarioId - The scenario id.
 * @returns The mutation result; call `mutateAsync` with the slot and sample id.
 */
export function useAttachSample(
  scenarioId: string,
): UseMutationResult<DatasetRecord, Error, AttachSampleInput> {
  const storeDataset = useStoreDataset(scenarioId);

  return useMutation({
    mutationFn: ({ slot, sampleId }: AttachSampleInput) => attachSample(scenarioId, slot, sampleId),
    onSuccess: storeDataset,
  });
}
