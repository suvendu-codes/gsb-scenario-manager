import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { Scenario } from '../../domain/scenario.js';
import { ScenarioStatus } from '../../domain/scenario-status.js';

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

const ListScenariosResponseSchema = z.object({
  items: z.array(ScenarioSummarySchema),
  nextCursor: z
    .string()
    .nullable()
    .meta({ description: 'Opaque cursor for the next page; null on the last page' }),
});

/** A scenario without its config; used for list items, where resolving each version would be N+1. */
export class ScenarioSummaryDto extends createZodDto(ScenarioSummarySchema) {}
export class ScenarioDto extends createZodDto(ScenarioSchema) {}
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

export const toScenario = (s: Scenario, configUri: string): ScenarioDto => ({
  ...toScenarioSummary(s),
  configUri,
});

export const toListScenariosResponse = (page: {
  items: Scenario[];
  next_cursor: string | null;
}): ListScenariosResponseDto => ({
  items: page.items.map(toScenarioSummary),
  nextCursor: page.next_cursor,
});
