import { z } from "zod";

import {
  moduleIdSchema,
  operationsCatalogSchema,
  SCHEDULER_WEIGHTS,
  STATION_SECTIONS,
} from "../schema";

const optionSchema = z.object({
  value: z.string(),
  label: z.string(),
  note: z.string().optional(),
});

/** Shows a field only while the value at `path` equals `equals`. */
const conditionSchema = z.object({
  path: z.string(),
  equals: z.union([z.string(), z.number(), z.boolean()]),
});

/**
 * Parts shared by every field. `path` is the dot-notation path of the value in the config;
 * per-station fields use `{stationId}` where the station id goes.
 */
const fieldBase = {
  path: z.string(),
  label: z.string(),
  hint: z.string().optional(),
  visibleWhen: conditionSchema.optional(),
  /** Per-station field that only makes sense for stations whose type has this hardware. */
  stationFeature: z.enum(["gravityInduction", "easyLoop"]).optional(),
};

/** One control of the config panel. */
export const catalogFieldSchema = z.discriminatedUnion("type", [
  z.object({
    ...fieldBase,
    type: z.literal("stepper"),
    min: z.number(),
    max: z.number(),
    step: z.number().optional(),
    unit: z.string().optional(),
    /** The largest value is the current value at this path (for example staffed <= positions). */
    maxPath: z.string().optional(),
  }),
  z.object({ ...fieldBase, type: z.literal("toggle") }),
  z.object({
    ...fieldBase,
    type: z.literal("choice"),
    variant: z.enum(["select", "cards", "segmented"]),
    options: z.array(optionSchema).min(2),
  }),
  z.object({ ...fieldBase, type: z.literal("multiCheck"), options: z.array(optionSchema).min(2) }),
  /** A whole-hour clock select, 00:00 to 23:00. */
  z.object({ ...fieldBase, type: z.literal("hour"), min: z.number(), max: z.number() }),
  /** Start and end hour of the data window; `path` points at the `{ startHour, endHour }` pair. */
  z.object({ ...fieldBase, type: z.literal("dataWindow") }),
  /** The scheduler weights; `path` points at the weights object. */
  z.object({
    ...fieldBase,
    type: z.literal("weights"),
    min: z.number(),
    max: z.number(),
    items: z.array(
      z.object({ key: z.enum(SCHEDULER_WEIGHTS), label: z.string(), note: z.string() }),
    ),
  }),
  /** A station's schedule: periods with a mode, a length and tea breaks. */
  z.object({ ...fieldBase, type: z.literal("schedule") }),
]);

/**
 * Where a section appears: `module` sections belong to the whole module, `allStations` to the
 * station-wide panel only, `eachStation` to both the All-stations panel (fanning out to the
 * stations it targets) and a single station's panel, `singleStation` to one station only.
 */
export const sectionScopeSchema = z.enum(["module", "allStations", "eachStation", "singleStation"]);

export const catalogSectionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  scope: sectionScopeSchema,
  /** For schedule and structure: the key in `station.apply` and `station.override`. */
  overrideSection: z.enum(STATION_SECTIONS).optional(),
  /** Set when the fields come from the `operations` catalog instead of `fields`. */
  fieldsFrom: z.literal("operations").optional(),
  fields: z.array(catalogFieldSchema),
});

export const catalogModuleSchema = z.object({
  id: moduleIdSchema,
  label: z.string(),
  description: z.string(),
  sections: z.array(catalogSectionSchema),
});

/** A named set of scheduler weights. The panel shows the preset whose weights match. */
export const schedulerPresetSchema = z.object({
  id: z.string(),
  label: z.string(),
  weights: z.record(z.enum(SCHEDULER_WEIGHTS), z.number()),
});

/** A station as the site registry describes it. Shown for reference; not editable here. */
export const botTypeSchema = z.object({
  id: z.enum(["htm", "vtm"]),
  label: z.string(),
  /** Picture of the bot; null until the image assets are added. */
  imageUrl: z.string().nullable(),
});

/**
 * The response of `GET /config/catalog`: what the config panel is built from. It holds
 * definitions only; values come from `GET /scenarios/{id}/config`.
 */
export const configCatalogSchema = z.object({
  version: z.number(),
  modules: z.array(catalogModuleSchema),
  presets: z.array(schedulerPresetSchema),
  botTypes: z.array(botTypeSchema),
  operations: operationsCatalogSchema,
});
