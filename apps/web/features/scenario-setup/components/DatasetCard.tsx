"use client";

import { Upload } from "lucide-react";

import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { ACCEPTED_FILE_TYPES } from "../constants";
import { downloadTemplate } from "../download-template";
import { samplesForSlot } from "../samples";
import type { DatasetRecord, DatasetSlotInfo } from "../types";
import { datasetCardStyles as styles } from "./DatasetCard.styles";

/** Select value for "the file the user uploaded", which is not one of the sample files. */
const UPLOADED_FILE = "__uploaded__";

type DatasetCardProps = {
  slot: DatasetSlotInfo;
  /** The file currently attached to this dataset, if any. */
  record: DatasetRecord | null;
  /** Problems found by the last validation, shown as a red card when above 0. */
  issueCount: number;
  /** True while this dataset is being saved. */
  busy: boolean;
  /** A save error to show under the card's controls. */
  error?: string;
  onChooseSample: (sampleId: string) => void;
  onUpload: (file: File) => void;
};

/**
 * One dataset on the setup screen: its name, a dropdown of sample files, an Upload button
 * and a template download link. The card is green once it has a file, and red when
 * validation found problems in it.
 *
 * @param slot - Which dataset this card is for.
 * @param record - The attached file, or null.
 * @param issueCount - Problems from the last validation.
 * @param busy - Whether the dataset is being saved.
 * @param error - A save error to show.
 * @param onChooseSample - Called with a sample file's id when the user picks one.
 * @param onUpload - Called with the file the user chose to upload.
 */
export function DatasetCard({
  slot,
  record,
  issueCount,
  busy,
  error,
  onChooseSample,
  onUpload,
}: DatasetCardProps): React.JSX.Element {
  const samples = samplesForSlot(slot.key);
  const hasError = issueCount > 0;
  const selectedSample = samples.find((sample) => sample.fileName === record?.fileName);
  const selectValue =
    record?.source === "sample" && selectedSample ? selectedSample.id : record ? UPLOADED_FILE : "";
  const inputId = `dataset-${slot.key}`;

  return (
    <div
      className={cn(styles.root, record && (hasError ? styles.rootError : styles.rootHas))}
      aria-busy={busy}
    >
      <div className={styles.head}>
        <span
          className={cn(styles.dot, record && (hasError ? styles.dotError : styles.dotHas))}
          aria-hidden="true"
        />
        <h3 className={styles.label}>{slot.label}</h3>
        {!slot.required && <span className={styles.optionalTag}>optional</span>}
      </div>
      <p className={styles.description}>{slot.description}</p>

      <div className={styles.choiceRow}>
        <div className={styles.selectWrap}>
          <Select
            id={inputId}
            aria-label={`${slot.label} dataset`}
            className={cn(styles.select, hasError && styles.selectError)}
            value={selectValue}
            disabled={busy}
            onChange={(event) => {
              if (event.target.value !== UPLOADED_FILE) onChooseSample(event.target.value);
            }}
          >
            <option value="" disabled>
              Select dataset…
            </option>
            {samples.map((sample) => (
              <option key={sample.id} value={sample.id}>
                {sample.fileName}
              </option>
            ))}
            {record?.source === "upload" && (
              <option value={UPLOADED_FILE}>{record.fileName}</option>
            )}
          </Select>
        </div>

        <label className={cn(styles.upload, busy && styles.uploadBusy)}>
          <Upload className={styles.uploadIcon} aria-hidden="true" />
          {busy ? "Saving…" : "Upload data"}
          <input
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            className={styles.fileInput}
            aria-label={`Upload ${slot.label} file`}
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      <div className={styles.templateRow}>
        <button
          type="button"
          className={styles.templateLink}
          onClick={() => downloadTemplate(slot.key)}
        >
          Download template
        </button>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
