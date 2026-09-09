import { LaneGroup, TimelineEvent, Metric } from "./types";
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
