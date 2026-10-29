"use client";

import { useEffect, useMemo, useState } from "react";

import { analyzeFile, type FileAnalysis } from "./csv/analyze";
import { useAttachSample, useUploadDataset } from "./hooks";
import type { DatasetSlot, ScenarioDatasets } from "./types";
import { hasRequiredDatasets, validateScenarioDatasets, type ValidationResult } from "./validation";

/** How long the "Validating…" progress bar runs, in milliseconds. */
const VALIDATION_DELAY_MS = 600;

type Phase = "idle" | "validating" | "done";

/** What the datasets step needs to show and do. */
export type SetupFlow = {
  /** The validation result once it has run, or null before that or after a dataset changed. */
  result: ValidationResult | null;
  isValidating: boolean;
  /** True when validation has run and passed. */
  isValidated: boolean;
  /** True when the three required datasets are present, so validation can start. */
  canValidate: boolean;
  /** The dataset currently being saved, if any. */
  busySlot: DatasetSlot | null;
  /** A save error to show on a dataset's card. */
  cardErrors: Partial<Record<DatasetSlot, string>>;
  chooseSample: (slot: DatasetSlot, sampleId: string) => void;
  uploadFile: (slot: DatasetSlot, file: File) => void;
  validate: () => void;
};

/**
 * The state and actions of the datasets step: picking a sample file or uploading one,
 * then validating. Any change to a dataset throws away the previous validation result,
 * so a stale pass or fail is never shown. Validation runs on click, not automatically.
 *
 * @param scenarioId - The scenario being set up.
 * @param datasets - The scenario's current datasets, from the server.
 */
export function useSetupFlow(scenarioId: string, datasets: ScenarioDatasets): SetupFlow {
  const [phase, setPhase] = useState<Phase>("idle");
  const [analyses, setAnalyses] = useState<Partial<Record<DatasetSlot, FileAnalysis>>>({});
  const [busySlot, setBusySlot] = useState<DatasetSlot | null>(null);
  const [cardErrors, setCardErrors] = useState<Partial<Record<DatasetSlot, string>>>({});

  const upload = useUploadDataset(scenarioId);
  const attach = useAttachSample(scenarioId);

  useEffect(() => {
    if (phase !== "validating") return;
    const timer = setTimeout(() => setPhase("done"), VALIDATION_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  const result = useMemo(
    () => (phase === "done" ? validateScenarioDatasets(datasets, analyses) : null),
    [phase, datasets, analyses],
  );

  function startSaving(slot: DatasetSlot): void {
    setBusySlot(slot);
    setCardErrors((errors) => ({ ...errors, [slot]: undefined }));
    setPhase("idle");
  }

  function failSaving(slot: DatasetSlot, error: Error): void {
    setCardErrors((errors) => ({ ...errors, [slot]: error.message }));
  }

  function chooseSample(slot: DatasetSlot, sampleId: string): void {
    startSaving(slot);
    attach
      .mutateAsync({ slot, sampleId })
      .then(() => setAnalyses((current) => ({ ...current, [slot]: undefined })))
      .catch((error: Error) => failSaving(slot, error))
      .finally(() => setBusySlot(null));
  }

  function uploadFile(slot: DatasetSlot, file: File): void {
    startSaving(slot);
    analyzeFile(slot, file)
      .then(async (analysis) => {
        const { valid, issues, profile } = analysis.record;
        await upload.mutateAsync({ slot, file, report: { valid, issues, profile } });
        setAnalyses((current) => ({ ...current, [slot]: analysis }));
      })
      .catch((error: Error) => failSaving(slot, error))
      .finally(() => setBusySlot(null));
  }

  return {
    result,
    isValidating: phase === "validating",
    isValidated: result?.passed ?? false,
    canValidate: hasRequiredDatasets(datasets),
    busySlot,
    cardErrors,
    chooseSample,
    uploadFile,
    validate: () => setPhase("validating"),
  };
}
