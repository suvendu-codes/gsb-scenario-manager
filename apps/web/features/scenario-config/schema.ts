import { z } from "zod";

import { problemSchema } from "@/lib/api/error";

import operationsJson from "./catalog/operations.json";

/** The three modules of the scenario config panel. */
export const MODULE_IDS = ["wms", "station", "agent"] as const;
export const moduleIdSchema = z.enum(MODULE_IDS);

/** Order types a scenario can generate, in the order the panel lists them. */
export const ORDER_TYPES = ["inbound", "outbound"] as const;

/** What a station does during one period of its schedule. */
/** The modes a station works in. A station not working at all has an empty schedule. */
export const STATION_MODES = ["pick", "put", "audit"] as const;

/** The two station sections where a station can keep its own value within its type. */
export const STATION_SECTIONS = ["schedule", "structure"] as const;

export const TEA_PATTERNS = ["staggered", "random"] as const;

/** Scheduler weight keys, in the order the panel lists them. */
export const SCHEDULER_WEIGHTS = [
  "ppf",
  "pbt",
  "pbtBreached",
  "pbtRisk",
  "largeOrders",
  "skuConsolidation",
] as const;

/** Builds a `z.enum` from values that are only known at runtime (the generated catalog). */
function oneOf(values: string[]): z.ZodType<string> {
  return z.enum(values as [string, ...string[]]);
}

// ---------------------------------------------------------------------------------------------
// Operations catalog (generated from the design's pick / put / audit definitions)
// ---------------------------------------------------------------------------------------------

const optionSchema = z.object({
  value: z.string(),
  label: z.string(),
  note: z.string().optional(),
});

const choiceFieldSchema = z.object({
  key: z.string(),
  type: z.literal("choice"),
  label: z.string(),
  description: z.string().optional(),
  options: z.array(optionSchema).min(2),
  /** The `value` of the option a station starts on. Declared, not implied by the option order. */
  default: z.string(),
});

const toggleFieldSchema = z.object({
  key: z.string(),
  type: z.literal("toggle"),
  label: z.string(),
  description: z.string().optional(),
  /** Whether the switch starts on. */
  default: z.boolean(),
});

const operationFieldSchema = z.discriminatedUnion("type", [choiceFieldSchema, toggleFieldSchema]);

const putFlowSchema = z.object({
  id: z.string(),
  label: z.string(),
  /** Id of the follow-up question asked once this flow is chosen. */
  followUp: z.string().optional(),
  exception: z.boolean().optional(),
});

/** The pick, put and audit fields the Operations section is built from. */
const putSideSchema = z.enum(["front", "back"]);

const operationsShapeSchema = z.object({
  pick: z.object({
    binStructure: choiceFieldSchema,
    groups: z.array(
      z.object({ id: z.string(), label: z.string(), fields: z.array(operationFieldSchema) }),
    ),
  }),
  put: z.object({
    categories: z.array(
      z.object({
        value: z.string(),
        label: z.string(),
        flows: z.object({
          front: z.array(putFlowSchema).optional(),
          back: z.array(putFlowSchema).optional(),
        }),
      }),
    ),
    followUps: z.record(
      z.string(),
      z.object({
        question: z.string(),
        options: z.array(z.object({ value: z.string(), label: z.string(), config: z.string() })),
      }),
    ),
    /** The put settings a station starts with. Declared, not implied by the flow order. */
    defaults: z.object({
      category: z.string(),
      sides: z.array(putSideSchema).min(1),
      behavior: z.object({ front: z.string().nullable(), back: z.string().nullable() }),
      followUp: z.object({ front: z.string().nullable(), back: z.string().nullable() }),
    }),
  }),
  audit: z.object({ fields: z.array(toggleFieldSchema) }),
});

/**
 * The pick, put and audit fields the Operations section is built from, with the default of
 * each. The declared defaults are checked against the options, so a regenerated catalog that
 * reorders options, or drops one a default points at, fails here instead of silently changing
 * what stations start on.
 */
export const operationsCatalogSchema = operationsShapeSchema.superRefine((catalog, ctx) => {
  const choices = [
    catalog.pick.binStructure,
    ...catalog.pick.groups.flatMap((group) => group.fields),
  ].filter((field) => field.type === "choice");
  for (const field of choices) {
    if (!field.options.some((option) => option.value === field.default)) {
      ctx.addIssue({
        code: "custom",
        message: `The default "${field.default}" of ${field.key} is not one of its options.`,
      });
    }
  }

  const { defaults, categories, followUps } = catalog.put;
  const category = categories.find((candidate) => candidate.value === defaults.category);
  if (!category) {
    ctx.addIssue({
      code: "custom",
      message: `The default put category "${defaults.category}" does not exist.`,
    });
    return;
  }
  for (const side of putSideSchema.options) {
    const flowId = defaults.behavior[side];
    if (flowId !== null && !(category.flows[side] ?? []).some((flow) => flow.id === flowId)) {
      ctx.addIssue({
        code: "custom",
        message: `The default ${side} put flow "${flowId}" is not a ${side} flow of ${defaults.category}.`,
      });
    }
    const answer = defaults.followUp[side];
    const allowed = Object.values(followUps).flatMap((q) => q.options.map((o) => o.value));
    if (answer !== null && !allowed.includes(answer)) {
      ctx.addIssue({
        code: "custom",
        message: `The default ${side} follow-up "${answer}" is not an answer to any question.`,
      });
    }
  }
});

/** The validated operations catalog. Parsing here also checks the generated JSON file. */
export const operationsCatalog = operationsCatalogSchema.parse(operationsJson);

/** Every pick field, including the bin structure. */
const pickFields = [
  operationsCatalog.pick.binStructure,
  ...operationsCatalog.pick.groups.flatMap((group) => group.fields),
];

/** One value per pick field: the chosen option's `value` for choices, a boolean for toggles. */
export const pickConfigSchema = z
  .object(
    Object.fromEntries(
      pickFields.map((field) => [
        field.key,
        field.type === "toggle" ? z.boolean() : oneOf(field.options.map((o) => o.value)),
      ]),
    ),
  )
  .strict() as z.ZodType<Record<string, string | boolean>>;

const flowIds = operationsCatalog.put.categories.flatMap((category) =>
  Object.values(category.flows).flatMap((flows) => flows.map((flow) => flow.id)),
);
const followUpValues = Object.values(operationsCatalog.put.followUps).flatMap((followUp) =>
  followUp.options.map((option) => option.value),
);

const bySideSchema = <T extends z.ZodTypeAny>(value: T) =>
  z.object({ front: value, back: value }).strict();

export const putConfigSchema = z
  .object({
    category: oneOf(operationsCatalog.put.categories.map((c) => c.value)),
    sides: z.array(z.enum(["front", "back"])).min(1),
    /** The chosen put flow per side (null when none chosen). */
    behavior: bySideSchema(oneOf(flowIds).nullable()),
    /** The answer to the chosen flow's follow-up question per side (null when none). */
    followUp: bySideSchema(oneOf(followUpValues).nullable()),
  })
  .strict();

export const auditConfigSchema = z
  .object(Object.fromEntries(operationsCatalog.audit.fields.map((f) => [f.key, z.boolean()])))
  .strict() as z.ZodType<Record<string, boolean>>;

// ---------------------------------------------------------------------------------------------
// Config values
// ---------------------------------------------------------------------------------------------

/** Orders and demand (the design calls this "WMS (Order)"). */
export const wmsConfigSchema = z
  .object({
    /** Scales the outbound profile; above 1 the extra volume is synthetic. */
    volumeMultiplier: z.number().min(0.5).max(2.5).multipleOf(0.25),
    outboundDistribution: z.enum(["as_in_dataset", "flatline", "pareto", "staggered"]),
    /** Only this part of the day (hours 0-24) feeds the run. */
    dataWindow: z
      .object({
        startHour: z.number().int().min(0).max(23),
        endHour: z.number().int().min(1).max(24),
      })
      .strict(),
    orderTypes: z.array(z.enum(ORDER_TYPES)),
    /** The order in which released orders are picked. */
    orderSequencing: z.enum(["fifo", "priority_weighted", "shortest_path"]),
    /** Share of incoming orders flagged critical, in percent. */
    criticalPct: z.number().min(0).max(100).multipleOf(5),
    release: z
      .object({
        pattern: z.enum(["waves", "streaming"]),
        waves: z.number().int().min(1).max(24),
      })
      .strict(),
    /** How far ahead of an order's pick-before time it can be released. */
    pbtWindowHours: z.number().min(0.5).max(24).multipleOf(0.5),
    /** Orders still open after this hour (0-23) are late. */
    cutoffHour: z.number().int().min(0).max(23),
  })
  .strict();

/** Settings that apply to the whole site, not to one station (the "Warehouse manager" settings). */
export const stationGlobalSchema = z
  .object({
    /** Share of time stations are in error (navigation errors, inlet and outlet blockages), in percent. */
    timeInErrorPct: z.number().int().min(0).max(50),
    /** Stock level, in percent of a slot, at which it is replenished, per slot class. */
    replenishment: z
      .object({
        a: z.number().int().min(0).max(100).multipleOf(5),
        b: z.number().int().min(0).max(100).multipleOf(5),
        c: z.number().int().min(0).max(100).multipleOf(5),
      })
      .strict(),
    orderHandling: z
      .object({
        crossStationRebalance: z.boolean(),
      })
      .strict(),
    pickScheduler: z
      .object({
        weights: z
          .object(
            Object.fromEntries(
              SCHEDULER_WEIGHTS.map((key) => [key, z.number().int().min(0).max(5)]),
            ) as Record<(typeof SCHEDULER_WEIGHTS)[number], z.ZodNumber>,
          )
          .strict(),
      })
      .strict(),
    limits: z
      .object({
        queueLimitPerStation: z.number().int().min(1).max(50),
      })
      .strict(),
  })
  .strict();

/** A regular break: every `everyHours` within its block, for `durationHours`. */
const regularBreakSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("break"),
    everyHours: z.number().min(0.5).multipleOf(0.5),
    durationHours: z.number().min(0.25).max(2).multipleOf(0.25),
  })
  .strict();

/** A tea break: `count` times within its block, placed by `pattern`. */
const teaBreakSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("tea"),
    pattern: z.enum(TEA_PATTERNS),
    durationMinutes: z.number().int().min(5).max(60).multipleOf(5),
    count: z.number().int().min(1).max(6),
  })
  .strict();

/** Most breaks one block can have. */
export const MAX_BREAKS_PER_BLOCK = 4;

/** Most blocks a station's schedule can have: one per mode. */
export const MAX_SCHEDULE_BLOCKS = 3;

/**
 * One block of a station's schedule: a length and the mode the station works in. A station's
 * blocks each have their own mode and add up to the run duration.
 */
export const scheduleBlockSchema = z
  .object({
    hours: z.number().min(0.5).multipleOf(0.5),
    mode: z.enum(STATION_MODES),
    breaks: z
      .array(z.discriminatedUnion("type", [regularBreakSchema, teaBreakSchema]))
      .max(MAX_BREAKS_PER_BLOCK),
  })
  .strict();

const stationStructureSchema = z
  .object({
    frontOperation: z.enum(["single", "dual"]),
    frontPositions: z.number().int().min(1).max(2),
    staffedFrontPositions: z.number().int().min(0).max(2),
    backOperator: z.enum(["manual", "shuttle"]),
    pickingDestination: z.enum(["tote", "packing_box"]),
    carrierAssociationSide: z.enum(["front", "back"]),
    binClearingSide: z.enum(["back", "front"]),
    staffedBackSeats: z.number().int().min(0).max(2),
  })
  .strict();

/** Hardware settings; a station only uses the ones its type has (gravity induction or EasyLoop). */
const stationHardwareSchema = z
  .object({
    inductionSpeed: z.number().int().min(4).max(30),
    singulationGap: z.number().int().min(10).max(60).multipleOf(5),
    jamAutoRecovery: z.boolean(),
    loopSpeed: z.number().int().min(20).max(100).multipleOf(5),
    trayCapacity: z.number().int().min(10).max(80).multipleOf(5),
    recirculation: z.enum(["immediate", "delayed", "manual"]),
  })
  .strict();

export const stationConfigSchema = z
  .object({
    /** Empty when the station is not assigned any mode. */
    schedule: z.array(scheduleBlockSchema).max(MAX_SCHEDULE_BLOCKS),
    structure: stationStructureSchema,
    hardware: stationHardwareSchema,
    operations: z
      .object({ pick: pickConfigSchema, put: putConfigSchema, audit: auditConfigSchema })
      .strict(),
  })
  .strict();

export const stationModuleSchema = z
  .object({
    global: stationGlobalSchema,
    stations: z.record(z.string(), stationConfigSchema),
  })
  .strict();

/** A percentage (0-50, whole) per bot type. */
const perBotType = z
  .object({ htm: z.number().int().min(0).max(50), vtm: z.number().int().min(0).max(50) })
  .strict();

export const agentConfigSchema = z
  .object({
    fleet: z
      .object({
        htm: z.number().int().min(0).max(200),
        vtm: z.number().int().min(0).max(200),
      })
      .strict(),
    /** Share of time bots are in error, in percent. */
    botOutagePct: z.number().int().min(0).max(50),
    /** Share of the run each bot type spends docked at chargers instead of working, in percent. */
    charging: perBotType,
    /** Share of the run each bot type spends turning instead of travelling, in percent. */
    turning: perBotType,
  })
  .strict();

/** The whole scenario config: one entry per module. */
export const configValuesSchema = z
  .object({
    wms: wmsConfigSchema,
    station: stationModuleSchema,
    agent: agentConfigSchema,
  })
  .strict();

// ---------------------------------------------------------------------------------------------
// API shapes
// ---------------------------------------------------------------------------------------------

/**
 * Changes sent in the dot-notation path map, e.g. `"wms.volumeMultiplier"`. Arrays (a station's
 * schedule, the order types) are single values, so they are replaced whole.
 */
export const overridesSchema = z.record(z.string(), z.unknown());

/**
 * A problem that stops the scenario from running: the API's problem shape (stable `code`,
 * English `message`, `params`, and a `path` when it is about one value) plus the module it
 * belongs to.
 */
export const configIssueSchema = problemSchema.extend({
  module: z.enum(["datasets", "wms", "station", "agent"]),
});

/**
 * The response of `GET` and `PATCH /scenarios/{id}/config`. The effective config is the defaults
 * with the overrides applied on top (see `resolveConfig`); empty `overrides` means the scenario
 * is on its defaults.
 */
export const scenarioConfigSchema = z.object({
  scenarioId: z.string(),
  /** When the config last changed. Opaque to the client and not required. */
  updatedAt: z.string().optional(),
  /** How long the run is, in hours. Read-only here; the setup screen owns it. */
  runDurationHours: z.number(),
  defaults: configValuesSchema,
  overrides: overridesSchema,
  /** Problems that would stop the run; empty when the scenario is ready. */
  issues: z.array(configIssueSchema),
});

/**
 * Body of `PATCH /scenarios/{id}/config`. `set` writes values at leaf paths; `reset` removes
 * the overrides at a path or under a prefix (so `"agent"` resets the whole module).
 */
export const patchConfigSchema = z
  .object({
    set: overridesSchema.optional(),
    reset: z.array(z.string().min(1)).optional(),
  })
  .refine((body) => Object.keys(body.set ?? {}).length > 0 || (body.reset ?? []).length > 0, {
    message: "Send at least one change in 'set' or 'reset'.",
  });
