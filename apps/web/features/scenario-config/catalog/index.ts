import { operationsCatalog } from "../schema";
import type { ConfigCatalog, StationInfo } from "../types";

/**
 * The config catalog served by the mock `GET /api/config/catalog`: the field definitions the
 * config panel is built from, the scheduler presets, the stations and the bot types.
 *
 * Ranges, labels and help text follow the design's config panel. Pick, put and audit fields
 * are generated from the design into `operations.json`. The consistency test in
 * `catalog.test.ts` checks these ranges against the schema that validates the values.
 */

/**
 * Stations of the mock site, as the registry describes them.
 *
 * MOCK: this is one fixed list for every map, and it ships inside the catalog. The real list
 * depends on the map and comes from the station registry, so the stations should move out of
 * the catalog, and the functions that read `STATION_IDS` (defaults, validation, the config
 * store, the station edit logic) should take the list as a parameter. Deferred until the
 * registry's fields are agreed (review M1).
 */
const STATIONS: StationInfo[] = [
  {
    id: "PPS-101",
    type: "Standard PPS",
    hasGravityInduction: false,
    hasEasyLoop: false,
    category: "Fixed",
    location: "A-01.2",
    pickDirection: 0,
    status: "connected",
    eligibleSystem: "rtp",
    registryUrl: "/v1/pps/pps-101",
  },
  {
    id: "PPS-102",
    type: "Easyloop PPS",
    hasGravityInduction: false,
    hasEasyLoop: true,
    category: "Fixed",
    location: "A-04.1",
    pickDirection: 1,
    status: "connected",
    eligibleSystem: "rtp",
    registryUrl: "/v1/pps/pps-102",
  },
  {
    id: "PPS-103",
    type: "Roll Cage PPS",
    hasGravityInduction: true,
    hasEasyLoop: false,
    category: "Dynamic",
    location: "B-03.7",
    pickDirection: 0,
    status: "disconnected",
    eligibleSystem: "rtp",
    registryUrl: "/v1/pps/pps-103",
  },
  {
    id: "PPS-104",
    type: "Standard PPS",
    hasGravityInduction: false,
    hasEasyLoop: false,
    category: "Fixed",
    location: "B-01.4",
    pickDirection: 0,
    status: "connected",
    eligibleSystem: "relay",
    registryUrl: "/v1/pps/pps-104",
  },
  {
    id: "PPS-105",
    type: "Easyloop PPS",
    hasGravityInduction: false,
    hasEasyLoop: true,
    category: "Dynamic",
    location: "C-02.3",
    pickDirection: 1,
    status: "connected",
    eligibleSystem: "relay",
    registryUrl: "/v1/pps/pps-105",
  },
  {
    id: "PPS-106",
    type: "Roll Cage PPS",
    hasGravityInduction: true,
    hasEasyLoop: false,
    category: "Fixed",
    location: "C-05.9",
    pickDirection: 0,
    status: "connected",
    eligibleSystem: "p2p",
    registryUrl: "/v1/pps/pps-106",
  },
];

/** Ids of the stations of the mock site, in display order. */
export const STATION_IDS: readonly string[] = STATIONS.map((station) => station.id);

const STATION = "station.stations.{stationId}";

export const configCatalog: ConfigCatalog = {
  version: 1,
  modules: [
    {
      id: "wms",
      label: "WMS (Order)",
      description: "Order types, the outbound distribution, and how orders are released.",
      sections: [
        {
          id: "volume",
          label: "Volume",
          description:
            "Reshapes the outbound dataset for this scenario. The file itself is not changed.",
          scope: "module",
          fields: [
            {
              type: "stepper",
              path: "wms.volumeMultiplier",
              label: "Volume multiplier",
              hint: "Volume above 1× is synthetic, not real order lines.",
              min: 0.25,
              max: 5,
              step: 0.25,
              unit: "x",
            },
            {
              type: "choice",
              variant: "select",
              path: "wms.outboundDistribution",
              label: "Distribution over the day",
              options: [
                {
                  value: "as_in_dataset",
                  label: "As in dataset",
                  note: "The dataset’s own hourly curve",
                },
                { value: "flatline", label: "Flatline", note: "The same volume every hour" },
                {
                  value: "pareto",
                  label: "Pareto",
                  note: "Front-loaded, decaying through the day",
                },
                {
                  value: "staggered",
                  label: "Staggered",
                  note: "The dataset’s curve shifted 6 hours later",
                },
              ],
            },
            {
              type: "dataWindow",
              path: "wms.dataWindow",
              label: "Data window",
              hint: "Only this part of the day feeds the run; the rest is left out.",
            },
          ],
        },
        {
          id: "demand",
          label: "Demand",
          scope: "module",
          fields: [
            {
              type: "multiCheck",
              path: "wms.orderTypes",
              label: "Order types",
              options: [
                { value: "inbound", label: "Inbound" },
                { value: "outbound", label: "Outbound" },
                { value: "replenishment", label: "Replenishment" },
                { value: "audit", label: "Audit" },
              ],
            },
            {
              type: "stepper",
              path: "wms.criticalPct",
              label: "Critical priority orders",
              hint: "Share of incoming orders flagged critical.",
              min: 0,
              max: 100,
              step: 5,
              unit: "%",
            },
          ],
        },
        {
          id: "release",
          label: "Release",
          scope: "module",
          fields: [
            {
              type: "choice",
              variant: "cards",
              path: "wms.release.pattern",
              label: "Release pattern",
              options: [
                {
                  value: "waves",
                  label: "Waves",
                  note: "Orders are released in batches at fixed times.",
                },
                {
                  value: "streaming",
                  label: "Streaming",
                  note: "Orders are released continuously as they arrive.",
                },
              ],
            },
            {
              type: "stepper",
              path: "wms.release.waves",
              label: "Number of waves",
              hint: "Released at even intervals across the run.",
              min: 1,
              max: 24,
              visibleWhen: { path: "wms.release.pattern", equals: "waves" },
            },
            {
              type: "stepper",
              path: "wms.pbtWindowHours",
              label: "PBT window",
              hint: "How far ahead of an order’s pick-before time it can be released.",
              min: 0.5,
              max: 24,
              step: 0.5,
              unit: "h",
            },
            {
              type: "hour",
              path: "wms.cutoffHour",
              label: "Order cutoff",
              hint: "Orders still open after this time are late.",
              min: 0,
              max: 23,
            },
          ],
        },
      ],
    },
    {
      id: "station",
      label: "Station Config",
      description:
        "When stations work, in which mode, and how they are built. All stations edits every station that still shares a setting.",
      sections: [
        {
          id: "errors",
          label: "Errors",
          scope: "allStations",
          fields: [
            {
              type: "toggle",
              path: "station.global.errorInjection",
              label: "Error injection",
              hint: "Simulates real-world errors, such as station blockages, during the run.",
            },
          ],
        },
        {
          id: "orderHandling",
          label: "Order handling",
          scope: "allStations",
          fields: [
            {
              type: "toggle",
              path: "station.global.orderHandling.crossStationRebalance",
              label: "Cross-station rebalancing",
              hint: "Bots carry a rack straight to another station that needs it, instead of returning it to storage first.",
            },
            {
              type: "choice",
              variant: "cards",
              path: "station.global.orderHandling.orderSequencing",
              label: "Order sequencing",
              options: [
                { value: "fifo", label: "FIFO", note: "First in, first out." },
                {
                  value: "priority_weighted",
                  label: "Priority-weighted",
                  note: "Higher-priority orders go first.",
                },
                {
                  value: "shortest_path",
                  label: "Shortest-path",
                  note: "Orders needing the least bot travel go first.",
                },
              ],
            },
          ],
        },
        {
          id: "pickScheduler",
          label: "Pick scheduler",
          description: "Decides which order a station works on next, above any single station.",
          scope: "allStations",
          fields: [
            {
              type: "weights",
              path: "station.global.pickScheduler.weights",
              label: "Weights",
              min: 0,
              max: 5,
              items: [
                { key: "ppf", label: "PPF (throughput)", note: "Picks per rack face" },
                { key: "pbt", label: "PBT (SLA)", note: "Pick-before-time priority" },
                { key: "pbtBreached", label: "PBT breached", note: "Already past deadline" },
                { key: "pbtRisk", label: "PBT risk of breach", note: "Forecast to breach soon" },
                { key: "largeOrders", label: "Large orders", note: "Multi-line decomposition" },
                {
                  key: "skuConsolidation",
                  label: "SKU consolidation",
                  note: "Reduce rack presentations",
                },
              ],
            },
          ],
        },
        {
          id: "queue",
          label: "Queue and replenishment",
          scope: "allStations",
          fields: [
            {
              type: "stepper",
              path: "station.global.limits.queueLimitPerStation",
              label: "Queue limit per station",
              hint: "Tasks that can wait at a station before new work is held back.",
              min: 1,
              max: 50,
            },
            {
              type: "stepper",
              path: "station.global.limits.replenishmentThresholdPct",
              label: "Replenishment threshold",
              hint: "Stock level, as a share of capacity, that triggers replenishment.",
              min: 0,
              max: 90,
              step: 5,
              unit: "%",
            },
          ],
        },
        {
          id: "schedule",
          label: "Schedule",
          description:
            "Each period runs one mode and always fills the run — lengthening one shortens the next. Tea breaks are short station pauses; staggered ones don’t stop every station at once.",
          scope: "eachStation",
          overrideSection: "schedule",
          fields: [{ type: "schedule", path: `${STATION}.schedule`, label: "Schedule" }],
        },
        {
          id: "structure",
          label: "Structure",
          scope: "eachStation",
          overrideSection: "structure",
          fields: [
            {
              type: "choice",
              variant: "segmented",
              path: `${STATION}.structure.frontOperation`,
              label: "Front operation",
              options: [
                { value: "single", label: "Single-front" },
                { value: "dual", label: "Dual-front" },
              ],
            },
            {
              type: "stepper",
              path: `${STATION}.structure.frontPositions`,
              label: "Front positions",
              hint: "Places at the front where carriers dock.",
              min: 1,
              max: 2,
            },
            {
              type: "stepper",
              path: `${STATION}.structure.staffedFrontPositions`,
              label: "Staffed positions",
              hint: "How many of the front positions have an operator.",
              min: 0,
              max: 2,
              maxPath: `${STATION}.structure.frontPositions`,
            },
            {
              type: "choice",
              variant: "segmented",
              path: `${STATION}.structure.backOperator`,
              label: "Back operator",
              options: [
                { value: "manual", label: "Manual" },
                { value: "shuttle", label: "Shuttle" },
              ],
            },
            {
              type: "choice",
              variant: "segmented",
              path: `${STATION}.structure.pickingDestination`,
              label: "Picking destination",
              hint: "Applies to Pick only.",
              options: [
                { value: "tote", label: "Tote" },
                { value: "packing_box", label: "Packing box" },
              ],
            },
            {
              type: "choice",
              variant: "segmented",
              path: `${STATION}.structure.carrierAssociationSide`,
              label: "Carrier association side",
              options: [
                { value: "front", label: "Front" },
                { value: "back", label: "Back" },
              ],
            },
            {
              type: "choice",
              variant: "segmented",
              path: `${STATION}.structure.binClearingSide`,
              label: "Bin clearing side",
              options: [
                { value: "back", label: "Back" },
                { value: "front", label: "Front" },
              ],
            },
            {
              type: "stepper",
              path: `${STATION}.structure.staffedBackSeats`,
              label: "Staffed back seats",
              hint: "How many of the 2 back seats have an operator.",
              min: 0,
              max: 2,
              visibleWhen: { path: `${STATION}.structure.binClearingSide`, equals: "back" },
            },
          ],
        },
        {
          id: "gravityInduction",
          label: "Gravity induction",
          scope: "singleStation",
          fields: [
            {
              type: "stepper",
              path: `${STATION}.hardware.inductionSpeed`,
              label: "Induction speed",
              hint: "How fast items are fed in.",
              min: 4,
              max: 30,
              unit: "m/min",
              stationFeature: "gravityInduction",
            },
            {
              type: "stepper",
              path: `${STATION}.hardware.singulationGap`,
              label: "Singulation gap",
              hint: "Space kept between items as they’re separated.",
              min: 10,
              max: 60,
              step: 5,
              unit: "mm",
              stationFeature: "gravityInduction",
            },
            {
              type: "toggle",
              path: `${STATION}.hardware.jamAutoRecovery`,
              label: "Jam auto-recovery",
              hint: "Jams clear without an operator stepping in.",
              stationFeature: "gravityInduction",
            },
          ],
        },
        {
          id: "easyLoop",
          label: "EasyLoop",
          scope: "singleStation",
          fields: [
            {
              type: "stepper",
              path: `${STATION}.hardware.loopSpeed`,
              label: "Loop speed",
              hint: "Share of the loop’s top speed.",
              min: 20,
              max: 100,
              step: 5,
              unit: "%",
              stationFeature: "easyLoop",
            },
            {
              type: "stepper",
              path: `${STATION}.hardware.trayCapacity`,
              label: "Tray capacity",
              hint: "How much the loop’s trays hold at once.",
              min: 10,
              max: 80,
              step: 5,
              stationFeature: "easyLoop",
            },
            {
              type: "choice",
              variant: "select",
              path: `${STATION}.hardware.recirculation`,
              label: "Recirculation",
              options: [
                { value: "immediate", label: "Immediate" },
                { value: "delayed", label: "Delayed" },
                { value: "manual", label: "Manual" },
              ],
              stationFeature: "easyLoop",
            },
          ],
        },
        {
          id: "operations",
          label: "Operations",
          description: "How Pick, Put and Audit behave at each station.",
          scope: "eachStation",
          fieldsFrom: "operations",
          fields: [],
        },
      ],
    },
    {
      id: "agent",
      label: "Agent",
      description: "HTM and VTM counts, and how often those bots are unavailable.",
      sections: [
        {
          id: "fleet",
          label: "Fleet and bot types",
          description:
            "HTM and VTM are fixed by the site’s flow. Only how many of each is set here.",
          scope: "module",
          fields: [
            {
              type: "stepper",
              path: "agent.fleet.htm",
              label: "Quicktron HTM",
              min: 0,
              max: 200,
            },
            {
              type: "stepper",
              path: "agent.fleet.vtm",
              label: "Quicktron VTM",
              min: 0,
              max: 200,
            },
          ],
        },
        {
          id: "availability",
          label: "Availability",
          scope: "module",
          fields: [
            {
              type: "stepper",
              path: "agent.botOutagePct",
              label: "Bot outage",
              hint: "Share of time bots are unavailable: navigation errors, blocked station inlets and outlets.",
              min: 0,
              max: 50,
              unit: "%",
            },
            {
              type: "toggle",
              path: "agent.botCharging",
              label: "Bot charging",
              hint: "Bots leave work to charge during the run.",
            },
          ],
        },
      ],
    },
  ],
  presets: [
    {
      id: "max_ppf_with_pbt",
      label: "Max PPF with PBT",
      weights: { ppf: 5, pbt: 4, pbtBreached: 5, pbtRisk: 3, largeOrders: 1, skuConsolidation: 2 },
    },
    {
      id: "pbt_fifo",
      label: "PBT FIFO",
      weights: { ppf: 1, pbt: 5, pbtBreached: 5, pbtRisk: 4, largeOrders: 1, skuConsolidation: 1 },
    },
    {
      id: "max_ppf_ignoring_pbt",
      label: "Max PPF ignoring PBT",
      weights: { ppf: 5, pbt: 0, pbtBreached: 0, pbtRisk: 0, largeOrders: 2, skuConsolidation: 4 },
    },
    {
      id: "breached_order",
      label: "Breached order",
      weights: { ppf: 1, pbt: 2, pbtBreached: 5, pbtRisk: 2, largeOrders: 1, skuConsolidation: 1 },
    },
    {
      id: "pick_clean",
      label: "Pick clean",
      weights: { ppf: 3, pbt: 1, pbtBreached: 1, pbtRisk: 1, largeOrders: 1, skuConsolidation: 5 },
    },
    {
      id: "returns_first",
      label: "Returns first",
      weights: { ppf: 2, pbt: 1, pbtBreached: 1, pbtRisk: 1, largeOrders: 5, skuConsolidation: 1 },
    },
  ],
  stations: STATIONS,
  botTypes: [
    { id: "htm", label: "Quicktron HTM", imageUrl: null },
    { id: "vtm", label: "Quicktron VTM", imageUrl: null },
  ],
  operations: operationsCatalog,
};
