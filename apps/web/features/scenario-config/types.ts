import { z } from "zod";

import type {
  botTypeSchema,
  catalogFieldSchema,
  catalogModuleSchema,
  catalogSectionSchema,
  configCatalogSchema,
  schedulerPresetSchema,
} from "./catalog/schema";
import {
  agentConfigSchema,
  configIssueSchema,
  configValuesSchema,
  moduleIdSchema,
  operationsCatalogSchema,
  patchConfigSchema,
  scenarioConfigSchema,
  scheduleBlockSchema,
  stationConfigSchema,
  wmsConfigSchema,
} from "./schema";

/** One of the three config modules: `wms`, `station` or `agent`. */
export type ModuleId = z.infer<typeof moduleIdSchema>;

/** The scenario config values (the defaults, or the effective config after `resolveConfig`). */
export type ConfigValues = z.infer<typeof configValuesSchema>;

export type WmsConfig = z.infer<typeof wmsConfigSchema>;
export type AgentConfig = z.infer<typeof agentConfigSchema>;

/** The full settings of one station: schedule, structure, hardware and operations. */
export type StationConfig = z.infer<typeof stationConfigSchema>;

/** One period of a station's schedule. */
export type ScheduleBlock = z.infer<typeof scheduleBlockSchema>;

/** Changes by dot-notation path, e.g. `{ "wms.volumeMultiplier": 2.25 }`. */
export type Overrides = Record<string, unknown>;

/** A problem that would stop the scenario from running. */
export type ConfigIssue = z.infer<typeof configIssueSchema>;

/** The response of `GET` and `PATCH /scenarios/{id}/config`. */
export type ScenarioConfig = z.infer<typeof scenarioConfigSchema>;

/** The body of `PATCH /scenarios/{id}/config`. */
export type PatchConfigBody = z.infer<typeof patchConfigSchema>;

export type OperationsCatalog = z.infer<typeof operationsCatalogSchema>;

/** The response of `GET /config/catalog`. */
export type ConfigCatalog = z.infer<typeof configCatalogSchema>;
export type CatalogModule = z.infer<typeof catalogModuleSchema>;
export type CatalogSection = z.infer<typeof catalogSectionSchema>;
export type CatalogField = z.infer<typeof catalogFieldSchema>;
export type SchedulerPreset = z.infer<typeof schedulerPresetSchema>;
export type BotType = z.infer<typeof botTypeSchema>;
