import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  type PaginatedResponse,
  PaginationMetaSchema,
} from '../../../common/interfaces/paginated-response.interface.js';
import type { ConfigChange } from '../../application/apply-config-patch.js';
import type { Scenario } from '../../domain/scenario.js';
import { ScenarioStatus } from '../../domain/scenario-status.js';
import { ScenarioConfigSchema } from './scenario-config.schema.js';

const dateTime = (description: string) => z.string().meta({ format: 'date-time', description });

const ScenarioSummarySchema = z.object({
  id: z.uuid().meta({ description: 'Scenario ID' }),
  projectId: z.string(),
  mapId: z.string(),
  name: z.string(),
  status: z.enum(Object.values(ScenarioStatus)),
  authorId: z.string(),
  clonedFromScenarioId: z
    .string()
    .optional()
    .meta({ description: 'Source scenario ID when this scenario was cloned' }),
  createdAt: dateTime('Creation time'),
  updatedAt: dateTime('Last update time'),
});

const ScenarioSchema = ScenarioSummarySchema.extend({
  configUri: z.string().meta({ description: 'URI of the current scenario config blob (e.g. gs://bucket/path/config.json)' }),
});

const ScenarioDetailSchema = ScenarioSchema.extend({
  config: ScenarioConfigSchema.meta({ description: 'Scenario config loaded from configUri' }),
});

const ListScenarioItemSchema = z.object({
  scenario_id: z.uuid().meta({ description: 'Scenario ID' }),
  name: z.string(),
  status: z.enum(Object.values(ScenarioStatus)),
  project_id: z.string(),
  map_id: z.string(),
  map_version: z.number().int().meta({ description: 'Maps are not versioned yet; always 1' }),
  created_by: z.string(),
  created_at: dateTime('Creation time'),
  updated_at: dateTime('Last update time'),
  latest_correlation_id: z
    .string()
    .nullable()
    .meta({ description: 'Correlation ID of the latest run; not resolved in list responses yet' }),
});

const ListScenariosResponseSchema = z.object({
  scenarios: z.array(ListScenarioItemSchema),
  meta: PaginationMetaSchema,
});

const CreateScenarioResponseSchema = z.object({
  scenario_id: z.uuid().meta({ description: 'Scenario ID' }),
  status: z.enum(Object.values(ScenarioStatus)),
  created_by: z.string(),
  created_at: dateTime('Creation time'),
});

const PatchScenarioResponseSchema = z.object({
  scenario_id: z.uuid().meta({ description: 'Scenario ID' }),
  name: z.string(),
  status: z.enum(Object.values(ScenarioStatus)),
  version: z.number().int(),
  updated_by: z.string(),
  updated_at: dateTime('Last update time'),
  updated_modules: z.array(z.string()),
  changes: z.array(
    z.object({
      path: z.string(),
      to: z.enum(['custom', 'default']),
      value: z.unknown(),
    }),
  ),
});

/** A scenario without its config; used for list items, where resolving each version would be N+1. */
export class ScenarioSummaryDto extends createZodDto(ScenarioSummarySchema) {}
export class ScenarioDto extends createZodDto(ScenarioSchema) {}
export class ScenarioDetailDto extends createZodDto(ScenarioDetailSchema) {}
export class CreateScenarioResponseDto extends createZodDto(CreateScenarioResponseSchema) {}
export class PatchScenarioResponseDto extends createZodDto(PatchScenarioResponseSchema) {}
export class ListScenariosResponseDto extends createZodDto(ListScenariosResponseSchema) {}

export const toScenarioSummary = (s: Scenario): ScenarioSummaryDto => ({
  id: s.id,
  projectId: s.projectId,
  mapId: s.mapId,
  name: s.name,
  status: s.status,
  authorId: s.authorId,
  clonedFromScenarioId: s.clonedFromScenarioId,
  createdAt: s.createdAt.toISOString(),
  updatedAt: s.updatedAt.toISOString(),
});

export const toCreateScenarioResponse = (s: Scenario): CreateScenarioResponseDto => ({
  scenario_id: s.id,
  status: s.status,
  created_by: s.authorId,
  created_at: s.createdAt.toISOString(),
});

export const toPatchScenarioResponse = (
  s: Scenario,
  updatedBy: string,
  changes: ConfigChange[],
  modules: string[],
): PatchScenarioResponseDto => ({
  scenario_id: s.id,
  name: s.name,
  status: s.status,
  version: s.version,
  updated_by: updatedBy,
  updated_at: s.updatedAt.toISOString(),
  updated_modules: modules,
  changes,
});

export const toScenario = (s: Scenario, configUri: string): ScenarioDto => ({
  ...toScenarioSummary(s),
  configUri,
});

export const toScenarioDetail = (
  s: Scenario,
  configUri: string,
  config: Record<string, unknown>,
): ScenarioDetailDto => ({
  ...toScenario(s, configUri),
  // The blob is stored as-is; its shape is documented, not enforced, since option sets are still open.
  config: config as ScenarioDetailDto['config'],
});

export const toListScenariosResponse = (page: PaginatedResponse<Scenario>): ListScenariosResponseDto => ({
  meta: page.meta,
  scenarios: page.items.map((s) => ({
    scenario_id: s.id,
    name: s.name,
    status: s.status,
    project_id: s.projectId,
    map_id: s.mapId,
    map_version: 1,
    created_by: s.authorId,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
    latest_correlation_id: null,
  })),
});
