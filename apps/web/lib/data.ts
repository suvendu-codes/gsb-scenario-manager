import { LaneGroup, TimelineEvent, Metric, Step, CategoryProfile, CategoryNumberFieldConfig, TemplateItem } from "./types";
export * from "./types";

export const laneGroups: LaneGroup[] = [
  {
    id: "manager-interventions",
    label: "Manager interventions",
    accent: "amber",
    lanes: [
      { id: "zone-reallocation", label: "Zone reallocation", count: 2 },
      { id: "staffing-shift-change", label: "Staffing / shift change", count: 2 },
      { id: "priority-override", label: "Priority override", count: 2 },
      { id: "induction-throttle", label: "Induction throttle", count: 2 },
    ],
  },
  {
    id: "order-flow",
    label: "Order flow",
    accent: "blue",
    lanes: [
      { id: "order-arrival", label: "Order arrival", count: 866 },
      { id: "release-to-floor", label: "Release to floor", count: 120 },
      { id: "sla-breach-risk", label: "SLA breach risk", count: 2 },
    ],
  },
  {
    id: "operator",
    label: "Operator",
    accent: "coral",
    lanes: [
      { id: "fatigue-signal", label: "Fatigue signal", count: 10 },
      { id: "station-timeout", label: "Station timeout", count: 4 },
      { id: "ui-error-mispick", label: "UI error / mispick", count: 5 },
    ],
  },
  {
    id: "bots-system",
    label: "Bots & system",
    accent: "teal",
    lanes: [
      { id: "bot-fault", label: "Bot fault", count: 3 },
      { id: "charge-cycle", label: "Charge cycle", count: 3 },
      { id: "aisle-congestion", label: "Aisle congestion", count: 13 },
    ],
  },
];

export function groupTotal(group: LaneGroup): number {
  return group.lanes.reduce((sum, lane) => sum + lane.count, 0);
}



export const metrics: Metric[] = [
  { label: "Arrival rate", value: "1", unit: "ord/min" },
  { label: "Open backlog", value: "1", unit: "orders" },
  { label: "Operator strain", value: "0", unit: "signals/2m" },
  { label: "Fleet incidents", value: "0", unit: "/2m" },
  { label: "SLA at risk", value: "0", unit: "cumulative" },
];


export const laneEvents: Record<string, TimelineEvent[]> = {
  "zone-reallocation": [],
  "staffing-shift-change": [],
  "priority-override": [],
  "induction-throttle": [],
  "order-arrival": [
    { time: 0 }, { time: 24 }, { time: 56 }, { time: 68 }, { time: 80 },
    { time: 100, count: 3 }, { time: 118 }, { time: 134 }, { time: 152, count: 2 },
    { time: 190, count: 2 }, { time: 210 }, { time: 226 },
    { time: 254 }, { time: 272, count: 2 }, { time: 288 },
    { time: 350, count: 2 }, { time: 372 },
  ],
  "release-to-floor": [{ time: 100 }, { time: 210 }, { time: 350 }],
  "sla-breach-risk": [],
  "fatigue-signal": [{ time: 240 }],
  "station-timeout": [],
  "ui-error-mispick": [],
  "bot-fault": [{ time: 240 }, { time: 254 }],
  "charge-cycle": [],
  "aisle-congestion": [],
};

export const quickInterventions = [
  "Call in +6 pickers",
  "Throttle induction to 60%",
  "Open overflow aisle",
  "Escalate SLA batch",
];

export const STEPS: Step[] = [
  { id: 1, title: "Bootstrap", subtitle: "profile & environment" },
  { id: 2, title: "Categories", subtitle: "1 category" },
  { id: 3, title: "Mock Inventory", subtitle: "3 SKUs" },
  { id: 4, title: "JSON Templates", subtitle: "order / orderline" },
  { id: 5, title: "Generate & Preview", subtitle: "not yet run" },
];


export const DEFAULT_CATEGORIES: CategoryProfile[] = [
  {
    id: "online",
    name: "online",
    avgOlPerOrder: 1,
    minOlCount: 1,
    maxOlCount: 1,
    minQtyPerOl: 1,
    maxQtyPerOl: 1,
    avgUnitsPerOrder: 1,
    singleLineOrdersPct: 100,
    olInWave: 100,
    wavesPerDay: 100,
    waveIntervalS: 1500,
    orderPoolSize: 0,
    flatShape: false,
    paretoBands: [{ skuPct: 20, orderPct: 80, inventoryPct: 30 }],
  },
  {
    id: "category2",
    name: "category2",
    avgOlPerOrder: 4.2,
    minOlCount: 4,
    maxOlCount: 5,
    minQtyPerOl: 1,
    maxQtyPerOl: 1,
    avgUnitsPerOrder: 4.2,
    singleLineOrdersPct: 0,
    olInWave: 100,
    wavesPerDay: 100,
    waveIntervalS: 1500,
    orderPoolSize: 0,
    flatShape: false,
    paretoBands: [{ skuPct: 60, orderPct: 100, inventoryPct: 70 }],
  },
];

export const CATEGORY_NUMBER_FIELDS: CategoryNumberFieldConfig[] = [
  { key: "avgOlPerOrder", label: "AVG OL / ORDER" },
  { key: "minOlCount", label: "MIN OL COUNT" },
  { key: "maxOlCount", label: "MAX OL COUNT" },
  { key: "minQtyPerOl", label: "MIN QTY / OL" },
  { key: "maxQtyPerOl", label: "MAX QTY / OL" },
  { key: "avgUnitsPerOrder", label: "AVG UNITS / ORDER" },
  { key: "singleLineOrdersPct", label: "SINGLE-LINE ORDERS", suffix: "%" },
  { key: "olInWave", label: "OL IN WAVE" },
  { key: "wavesPerDay", label: "WAVES / DAY" },
  { key: "waveIntervalS", label: "WAVE INTERVAL (S)" },
  { key: "orderPoolSize", label: "ORDER POOL SIZE" },
];
export const TEMPLATES: TemplateItem[] = [
  {
    id: "template-1",
    title: "Order Template (Pick)",
    content: JSON.stringify(
      {
        externalServiceRequestId: "{{orderId}}",
        type: "PICK",
        attributes: {
          pick_before_time: "{{pickBeforeTime}}",
          order_options: {
            priority: 0,
            bintags: ["ecom"],
          },
        },
      },
      null,
      2
    ),
  },
  {
    id: "template-2",
    title: "Orderline Template (Pick Line)",
    content: JSON.stringify(
      {
        externalServiceRequestId: "{{orderLineId}}",
        type: "PICK_LINE",
        expectations: {
          containers: [
            {
              products: [
                {
                  productQuantity: "{{quantity}}",
                  productAttributes: {
                    filter_parameters: ["product_sku = '{{sku}}'"],
                  },
                },
              ],
            },
          ],
        },
      },
      null,
      2
    ),
  },
  {
    id: "template-3",
    title: "Order Template (Put)",
    content: JSON.stringify(
      {
        externalServiceRequestId: "{{orderId}}",
        type: "PUT",
        attributes: {
          put_before_time: "{{putBeforeTime}}",
          order_options: {
            priority: 0,
          },
        },
      },
      null,
      2
    ),
  },
  {
    id: "template-4",
    title: "Orderline Template (Put Line)",
    content: JSON.stringify(
      {
        externalServiceRequestId: "{{orderLineId}}",
        type: "PUT_LINE",
        expectations: {
          containers: [
            {
              products: [
                {
                  productQuantity: "{{quantity}}",
                  productAttributes: {
                    filter_parameters: ["product_sku = '{{sku}}'"],
                  },
                },
              ],
            },
          ],
        },
      },
      null,
      2
    ),
  },
];