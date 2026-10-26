import type { DatasetSlot, SampleDataset } from "./types";

/**
 * Built-in example files offered in each card's dropdown, taken from the design.
 * The invalid ones carry the kind of problems the validation step reports.
 */
export const SAMPLE_DATASETS: ReadonlyArray<SampleDataset> = [
  {
    id: "in-1",
    slot: "inbound",
    fileName: "RDC_Inbound_Receipts.csv",
    valid: true,
    issues: [],
    profile: {
      hourly: [
        40, 30, 25, 20, 30, 90, 210, 340, 420, 480, 510, 460, 380, 300, 340, 420, 390, 280, 180,
        120, 90, 70, 60, 50,
      ],
    },
  },
  {
    id: "in-2",
    slot: "inbound",
    fileName: "Legacy_Inbound_Feed.csv",
    valid: false,
    issues: [
      'rows 42-511 reference receipt type "LAYER_PICK_EXPRESS", which this site\'s map schema does not recognize (470 lines)',
      "rows 118, 204, 390-612 reference dock doors outside the mapped zones (3,214 lines total)",
      "rows 700-812 are missing an ETA timestamp (113 lines)",
      'column "uom" contains unrecognized unit "CS-6" on 38 rows',
      "rows 900-955 reference SKU-00981, which is not present in the master data file",
      "duplicate receipt_id found on 12 rows (RCPT-20441 and 5 others)",
      "rows 1020-1066 have a negative quantity value",
      'column "eta" is unparseable on 24 rows (expected HH:MM)',
      'rows 1140-1205 reference dock door "D-99", which does not exist in this site map',
      "rows 1300-1348 are missing a receipt_id",
      'column "sku" is blank on 17 rows',
      'rows 1410-1466 reference a supplier code not recognized by this map ("SUP-XZ4")',
      "rows 1500-1522 have qty exceeding the SKU's rated pallet capacity",
      'rows 1600-1640 reference receiving zone "RZ-9", which is inactive in this map',
      "duplicate line_no found within 8 receipts",
      "rows 1700-1732 are missing a uom value entirely",
    ],
    profile: {
      hourly: [
        15, 12, 10, 8, 14, 40, 95, 150, 190, 210, 225, 200, 165, 130, 150, 185, 170, 120, 80, 55,
        40, 30, 25, 20,
      ],
    },
  },
  {
    id: "out-1",
    slot: "outbound",
    fileName: "RDC_Ecom_Orders.csv",
    valid: true,
    issues: [],
    profile: {
      hourly: [
        60, 45, 40, 35, 50, 110, 240, 380, 470, 520, 560, 600, 640, 690, 720, 520, 430, 360, 300,
        240, 180, 130, 100, 80,
      ],
      totalOrderlines: 17250,
      totalUnits: 60375,
    },
  },
  {
    id: "out-2",
    slot: "outbound",
    fileName: "Legacy_P2P_Orders.csv",
    valid: false,
    issues: [
      'rows 42-511 reference order type "LAYER_PICK_EXPRESS", which this site\'s map schema does not recognize (470 lines)',
      "rows 118, 204, 390-612 reference SKU locations outside the mapped zones (3,214 lines total)",
      "rows 640-701 have a pick-by time (pbt) later than their pack-by time (pat)",
      'column "priority" contains an unrecognized value "URGENT-3" on 27 rows',
      'rows 1140-1188 reference order_type "B2B_FREIGHT", which this scenario does not support',
      "duplicate order_id found on 19 rows (ORD-88213 and 18 others)",
      "rows 1250-1301 are missing a pack-by time (pat)",
      'column "qty" is zero or negative on 14 rows',
      "rows 1400-1455 reference SKU-04471, which is not present in the master data file",
      "rows 1500-1540 are missing an order_id",
      'column "sku" is blank on 21 rows',
      'rows 1600-1662 reference a carrier code not recognized by this map ("CR-88")',
      "rows 1700-1734 have qty exceeding the SKU's rated case pack",
      'rows 1800-1846 reference release zone "RZ-14", which is inactive in this map',
      "duplicate line_no found within 11 orders",
    ],
    profile: {
      hourly: [
        90, 70, 60, 55, 75, 160, 330, 500, 600, 640, 660, 690, 720, 760, 790, 580, 470, 390, 320,
        260, 200, 150, 115, 95,
      ],
      totalOrderlines: 15804,
      totalUnits: 41090,
    },
  },
  {
    id: "md-1",
    slot: "masterdata",
    fileName: "Full_SKU_Map.csv",
    valid: true,
    issues: [],
    profile: {
      velocity: [
        { label: "Fast", onHand: 1200, capacity: 1500 },
        { label: "Medium", onHand: 2600, capacity: 3200 },
        { label: "Slow", onHand: 4100, capacity: 4800 },
      ],
    },
  },
  {
    id: "md-2",
    slot: "masterdata",
    fileName: "Partial_SKU_Map.csv",
    valid: false,
    issues: [
      "rows 6-147 are missing a bin-location mapping (142 SKUs)",
      'Station "Layer Pick Station" has zero inventory slots assigned in this map',
    ],
    profile: {
      velocity: [
        { label: "Fast", onHand: 900, capacity: 1500 },
        { label: "Medium", onHand: 1400, capacity: 3200 },
        { label: "Slow", onHand: 1700, capacity: 4800 },
      ],
    },
  },
  {
    id: "mp-1",
    slot: "mockput",
    fileName: "RDC_MockPut_Layout.csv",
    valid: true,
    issues: [],
    profile: {},
  },
  {
    id: "mp-2",
    slot: "mockput",
    fileName: "RDC_MockPut_v2.csv",
    valid: true,
    issues: [],
    profile: {},
  },
];

/** The sample files offered for one slot, in display order. */
export function samplesForSlot(slot: DatasetSlot): SampleDataset[] {
  return SAMPLE_DATASETS.filter((sample) => sample.slot === slot);
}

/** Finds a sample file by id, or undefined if there is none. */
export function findSample(sampleId: string): SampleDataset | undefined {
  return SAMPLE_DATASETS.find((sample) => sample.id === sampleId);
}
