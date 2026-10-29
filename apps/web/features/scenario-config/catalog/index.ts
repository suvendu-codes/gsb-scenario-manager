import { operationsCatalog } from "../schema";
import type { ConfigCatalog } from "../types";

/**
 * The config catalog served by the mock `GET /api/config/catalog`: the field definitions the
 * config panel is built from, the scheduler presets and the bot types. Stations are not here:
 * they depend on the map and come from its PPS lookup.
 *
 * Ranges, labels and help text follow the design's config panel. Pick, put and audit fields
 * are generated from the design into `operations.json`. The consistency test in
 * `catalog.test.ts` checks these ranges against the schema that validates the values.
 */

const STATION = "station.stations.{stationId}";

export const configCatalog: ConfigCatalog = {
  version: 1,
  modules: [
    {
      id: "wms",
      label: "WMS (Order)",
      description: "How much demand the run replays, and how orders are sequenced and released.",
      sections: [
        {
          id: "volume",
          label: "Volume & distribution",
          description:
            "Reshapes the outbound dataset for this scenario. The file itself is not changed.",
          scope: "module",
          fields: [
            {
              type: "stepper",
              path: "wms.volumeMultiplier",
              label: "Volume multiplier",
              hint: "Scales the profile. Extra volume is synthetic.",
              min: 0.5,
              max: 2.5,
              step: 0.25,
              unit: "x",
            },
            {
              type: "dataWindow",
              path: "wms.dataWindow",
              label: "Data window",
              hint: "Hours of the day whose data feeds the run.",
            },
          ],
        },
        {
          id: "demand",
          label: "Demand profile",
          scope: "module",
          fields: [
            {
              type: "choice",
              variant: "select",
              path: "wms.orderSequencing",
              label: "Order sequencing",
              hint: "Order in which released orders are picked.",
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
            {
              type: "choice",
              variant: "select",
              path: "wms.release.pattern",
              label: "Batching / wave rule",
              hint: "Release orders continuously or in waves.",
              options: [
                {
                  value: "streaming",
                  label: "Streaming",
                  note: "Orders are released continuously as they arrive.",
                },
                {
                  value: "waves",
                  label: "Wave",
                  note: "Orders are released in batches at fixed times.",
                },
              ],
            },
            {
              type: "stepper",
              path: "wms.release.waves",
              label: "No. of waves",
              hint: "Number of release waves across the run.",
              min: 1,
              max: 24,
              visibleWhen: { path: "wms.release.pattern", equals: "waves" },
            },
            {
              type: "multiCheck",
              path: "wms.orderTypes",
              label: "Order types",
              hint: "Which order flows the run replays.",
              minSelected: 1,
              options: [
                { value: "inbound", label: "Inbound" },
                { value: "outbound", label: "Outbound" },
              ],
            },
            {
              type: "stepper",
              path: "wms.criticalPct",
              label: "Critical priority orders",
              hint: "Share of incoming orders flagged critical priority.",
              min: 0,
              max: 100,
              step: 5,
              unit: "%",
            },
            {
              type: "stepper",
              path: "wms.pbtWindowHours",
              label: "PBT window",
              hint: "Waving window ahead of each order’s pick-before time.",
              min: 0.5,
              max: 24,
              step: 0.5,
              unit: "h",
            },
            {
              type: "hour",
              path: "wms.cutoffHour",
              label: "Cutoff time",
              hint: "Orders arriving after this time are not released.",
              min: 0,
              max: 23,
            },
          ],
        },
      ],
    },
    {
      id: "station",
      label: "Stations & operators",
      description:
        "When stations work, in which mode, and how they are built. All stations edits every station that still shares a setting.",
      sections: [
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
          id: "replenishment",
          label: "Replenishment threshold",
          description: "Level at which a slot is replenished, by class. All pick stations.",
          scope: "allStations",
          fields: [
            {
              type: "stepper",
              path: "station.global.replenishment.a",
              label: "Class A",
              min: 0,
              max: 100,
              step: 5,
              unit: "%",
            },
            {
              type: "stepper",
              path: "station.global.replenishment.b",
              label: "Class B",
              min: 0,
              max: 100,
              step: 5,
              unit: "%",
            },
            {
              type: "stepper",
              path: "station.global.replenishment.c",
              label: "Class C",
              min: 0,
              max: 100,
              step: 5,
              unit: "%",
            },
          ],
        },
        {
          id: "timeInError",
          label: "Time in error",
          scope: "allStations",
          fields: [
            {
              type: "stepper",
              path: "station.global.timeInErrorPct",
              label: "Percentage of time in error",
              hint: "Simulates navigation errors and station inlet/outlet blockages to match real-world scenarios. Applies to all stations.",
              min: 0,
              max: 50,
              unit: "%",
            },
          ],
        },
        // Queue limit and rebalancing move to each station type's Station Setup with the type
        // layer; they stay here until then so no control goes missing.
        {
          id: "queue",
          label: "Queue and rebalancing",
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
              type: "toggle",
              path: "station.global.orderHandling.crossStationRebalance",
              label: "Cross-station rebalancing",
              hint: "Bots carry a rack straight to another station that needs it, instead of returning it to storage first.",
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
      label: "Agents",
      description:
        "How many bots of each type, how often they are in error, and their charging and turning time.",
      sections: [
        {
          id: "fleet",
          label: "Fleet & bot types",
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
          id: "outage",
          label: "Bot outage",
          scope: "module",
          fields: [
            {
              type: "stepper",
              path: "agent.botOutagePct",
              label: "Percentage of time bots are in error",
              hint: "Share of time bots are in error. Placement on the timeline is illustrative.",
              min: 0,
              max: 50,
              unit: "%",
            },
          ],
        },
        {
          id: "chargingTurning",
          label: "Bot charging and turning",
          scope: "module",
          fields: [
            {
              type: "stepper",
              path: "agent.charging.htm",
              label: "HTM charging time",
              hint: "Share of the run this bot type spends docked at chargers instead of working.",
              min: 0,
              max: 50,
              unit: "%",
            },
            {
              type: "stepper",
              path: "agent.turning.htm",
              label: "HTM turning time",
              hint: "Share of the run this bot type spends turning instead of travelling.",
              min: 0,
              max: 50,
              unit: "%",
            },
            {
              type: "stepper",
              path: "agent.charging.vtm",
              label: "VTM charging time",
              hint: "Share of the run this bot type spends docked at chargers instead of working.",
              min: 0,
              max: 50,
              unit: "%",
            },
            {
              type: "stepper",
              path: "agent.turning.vtm",
              label: "VTM turning time",
              hint: "Share of the run this bot type spends turning instead of travelling.",
              min: 0,
              max: 50,
              unit: "%",
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
  botTypes: [
    { id: "htm", label: "Quicktron HTM", imageUrl: null },
    { id: "vtm", label: "Quicktron VTM", imageUrl: null },
  ],
  operations: operationsCatalog,
};
