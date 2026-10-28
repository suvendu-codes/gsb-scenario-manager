import { operationsCatalog } from "@/features/scenario-config/schema";
import type { ConfigValues, ScheduleBlock, StationConfig } from "@/features/scenario-config/types";
import { fromSizer, type MapBotType } from "@/features/scenario-config/upstream/fleet";
import { fromUpstreamPps, type MapStation } from "@/features/scenario-config/upstream/stations";

import { MAP_FIXTURES } from "./data";

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

/** What a station's defaults are built from: its id and the modes the registry allows. */
export type StationSeed = Pick<MapStation, "id" | "allowedModes">;

/**
 * Six sample stations that allow every mode, for unit tests that need a small, fixed config.
 * The mock API builds each scenario's defaults from its map's fixtures instead.
 */
export const SAMPLE_STATIONS: readonly StationSeed[] = [101, 102, 103, 104, 105, 106].map((n) => ({
  id: `PPS-${n}`,
  allowedModes: ["pick", "put", "audit"],
}));

const SAMPLE_FLEET: readonly Pick<MapBotType, "fleetKey" | "count">[] = [
  { fleetKey: "htm", count: 10 },
  { fleetKey: "vtm", count: 10 },
];

/** What the sample stations do over the default 8 hour run. */
const SAMPLE_SCHEDULES: Record<string, DefaultBlock[]> = {
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

/**
 * A station's default schedule from the modes it allows: the whole run in its one mode, the run
 * split in half between its first two modes, or off when it allows none.
 */
function scheduleFor(station: StationSeed): DefaultBlock[] {
  const [first, second] = station.allowedModes;
  if (!first) return [{ hours: DEFAULT_RUN_DURATION_HOURS, mode: "off" }];
  if (!second) return [{ hours: DEFAULT_RUN_DURATION_HOURS, mode: first }];
  const half = DEFAULT_RUN_DURATION_HOURS / 2;
  return [
    { hours: half, mode: first },
    { hours: half, mode: second },
  ];
}

function defaultStation(station: StationSeed): StationConfig {
  const schedule = SAMPLE_SCHEDULES[station.id] ?? scheduleFor(station);
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
 *
 * @param stations - The map's stations; the sample stations when left out (for tests).
 * @param fleet - The sizer's bot counts by fleet key; a type the config has no key for is left
 *   out, and a key the sizer does not give starts at 0.
 */
export function buildDefaults(
  stations: readonly StationSeed[] = SAMPLE_STATIONS,
  fleet: readonly Pick<MapBotType, "fleetKey" | "count">[] = SAMPLE_FLEET,
): ConfigValues {
  const count = (key: string) => fleet.find((bot) => bot.fleetKey === key)?.count ?? 0;
  return {
    wms: {
      volumeMultiplier: 1,
      outboundDistribution: "as_in_dataset",
      dataWindow: { startHour: 0, endHour: 24 },
      orderTypes: ["inbound", "outbound"],
      orderSequencing: "fifo",
      criticalPct: 10,
      release: { pattern: "waves", waves: 4 },
      pbtWindowHours: 2,
      cutoffHour: 18,
    },
    station: {
      global: {
        errorInjection: false,
        orderHandling: { crossStationRebalance: true },
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
      stations: Object.fromEntries(
        stations.map((station) => [station.id, defaultStation(station)]),
      ),
    },
    agent: {
      fleet: { htm: count("htm"), vtm: count("vtm") },
      botOutagePct: 5,
      charging: { htm: 10, vtm: 10 },
      turning: { htm: 3, vtm: 3 },
    },
  };
}

/**
 * The defaults of a map, built from its fixtures the way a real server would build them from
 * the site registry and the sizer. A map without fixtures has no stations and no bots.
 *
 * @param mapId - The map id.
 */
export function defaultsForMap(mapId: string): ConfigValues {
  const fixture = MAP_FIXTURES[mapId];
  const stations = fixture ? (fromUpstreamPps(fixture.pps)?.stations ?? []) : [];
  const fleet = fixture ? (fromSizer(fixture.sizer)?.botTypes ?? []) : [];
  return buildDefaults(stations, fleet);
}
