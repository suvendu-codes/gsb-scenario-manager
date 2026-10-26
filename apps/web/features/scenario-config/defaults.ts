import { STATION_IDS } from "./catalog";
import { operationsCatalog } from "./schema";
import type { ConfigValues, ScheduleBlock, StationConfig } from "./types";

/**
 * The run length the mock config is built for.
 *
 * The run length is read-only today. When it becomes editable, every stored station schedule
 * (a whole array, so a schedule override too) would stop adding up to it. The intended
 * migration is to scale them in proportion, as the design does when the duration changes:
 * periods snap to half hours, any that no longer fit drop off the end, and the server returns
 * the scaled config. Resetting the schedules, or refusing the change while schedule overrides
 * exist, were the alternatives considered. None of this is built yet (review S2).
 */
export const DEFAULT_RUN_DURATION_HOURS = 8;

type DefaultBlock = Pick<ScheduleBlock, "hours" | "mode">;

/** What each station does over the default 8 hour run. */
const DEFAULT_SCHEDULES: Record<string, DefaultBlock[]> = {
  "PPS-101": [
    { hours: 4, mode: "pick" },
    { hours: 4, mode: "put" },
  ],
  "PPS-102": [{ hours: 8, mode: "pick" }],
  "PPS-103": [
    { hours: 4, mode: "off" },
    { hours: 4, mode: "audit" },
  ],
  "PPS-104": [{ hours: 8, mode: "put" }],
  "PPS-105": [{ hours: 8, mode: "off" }],
  "PPS-106": [{ hours: 8, mode: "pick" }],
};

/** Pick fields start on the default the catalog declares for each one. */
function defaultPick(): StationConfig["operations"]["pick"] {
  const { binStructure, groups } = operationsCatalog.pick;
  const pick: Record<string, string | boolean> = { [binStructure.key]: binStructure.default };
  for (const field of groups.flatMap((group) => group.fields)) pick[field.key] = field.default;
  return pick;
}

function defaultStation(id: string): StationConfig {
  const schedule = DEFAULT_SCHEDULES[id] ?? [{ hours: DEFAULT_RUN_DURATION_HOURS, mode: "off" }];
  return {
    schedule: schedule.map((block) => ({ ...block, teaBreaks: [] })),
    structure: {
      frontOperation: "single",
      frontPositions: 1,
      staffedFrontPositions: 1,
      backOperator: "manual",
      pickingDestination: "tote",
      carrierAssociationSide: "front",
      binClearingSide: "back",
      staffedBackSeats: 1,
    },
    hardware: {
      inductionSpeed: 12,
      singulationGap: 25,
      jamAutoRecovery: true,
      loopSpeed: 70,
      trayCapacity: 40,
      recirculation: "immediate",
    },
    operations: {
      pick: defaultPick(),
      put: structuredClone(operationsCatalog.put.defaults),
      audit: Object.fromEntries(
        operationsCatalog.audit.fields.map((field) => [field.key, field.default]),
      ),
    },
  };
}

/**
 * The default scenario config: what a scenario starts from. Returns a fresh object each call.
 * A real server would build this from the scenario's map and solution.
 */
export function buildDefaults(): ConfigValues {
  return {
    wms: {
      volumeMultiplier: 1,
      outboundDistribution: "as_in_dataset",
      dataWindow: { startHour: 0, endHour: 24 },
      orderTypes: ["inbound", "outbound"],
      criticalPct: 10,
      release: { pattern: "waves", waves: 4 },
      pbtWindowHours: 2,
      cutoffHour: 18,
    },
    station: {
      global: {
        errorInjection: false,
        orderHandling: { crossStationRebalance: true, orderSequencing: "fifo" },
        pickScheduler: {
          weights: {
            ppf: 5,
            pbt: 4,
            pbtBreached: 5,
            pbtRisk: 3,
            largeOrders: 1,
            skuConsolidation: 2,
          },
        },
        limits: { queueLimitPerStation: 10, replenishmentThresholdPct: 20 },
      },
      apply: { schedule: [], structure: [] },
      override: { schedule: [], structure: [] },
      stations: Object.fromEntries(STATION_IDS.map((id) => [id, defaultStation(id)])),
    },
    agent: { fleet: { htm: 10, vtm: 10 }, botOutagePct: 5, botCharging: true },
  };
}
