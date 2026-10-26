import type { DatasetSlot, DatasetSlotInfo, DatasetTemplate } from "./types";

/** The four dataset cards, in display order. */
export const DATASET_SLOTS: ReadonlyArray<DatasetSlotInfo> = [
  {
    key: "inbound",
    label: "Inbound",
    description: "inbound receipts & putaway volume",
    required: true,
  },
  {
    key: "outbound",
    label: "Outbound",
    description: "outbound order & release volume",
    required: true,
  },
  {
    key: "masterdata",
    label: "Master data",
    description: "SKU, location & bin master data",
    required: true,
  },
  {
    key: "mockput",
    label: "Mockput",
    description: "mock put layout for RTP flows",
    required: false,
  },
];

/** Slots that must have a dataset before the scenario can be validated. */
export const REQUIRED_SLOTS: ReadonlyArray<DatasetSlot> = DATASET_SLOTS.filter(
  (slot) => slot.required,
).map((slot) => slot.key);

/** File types the upload button accepts. */
export const ACCEPTED_FILE_TYPES = ".csv,.tsv,.txt";

/** Largest file the browser will read and upload. */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Template per slot: what the uploaded file's columns must be, and an example row. */
export const DATA_TEMPLATES: Record<DatasetSlot, DatasetTemplate> = {
  inbound: {
    filename: "inbound_data_template.csv",
    columns: ["receipt_id", "dock_door", "sku", "qty", "uom", "eta"],
    exampleRow: ["RCPT-10001", "D-04", "SKU-00042", "120", "EA", "08:00"],
  },
  outbound: {
    filename: "outbound_data_template.csv",
    columns: ["order_id", "line_no", "sku", "priority", "order_type", "pbt", "pat", "qty", "uom"],
    exampleRow: ["ORD-10001", "1", "SKU-00042", "Standard", "Pick", "08:00", "12:00", "4", "EA"],
  },
  masterdata: {
    filename: "masterdata_template.csv",
    columns: ["sku", "bin_location", "velocity_class", "on_hand", "capacity", "bin_tag"],
    exampleRow: ["SKU-00042", "A-14.2-03", "Fast", "1200", "1500", "single"],
  },
  mockput: {
    filename: "mockput_template.csv",
    columns: ["put_zone", "carrier_type", "capacity", "priority"],
    exampleRow: ["PZ-01", "Tote", "48", "1"],
  },
};

/** Simulation duration limits and default, in hours. */
export const SIM_DURATION = { min: 1, max: 24, default: 8 } as const;
