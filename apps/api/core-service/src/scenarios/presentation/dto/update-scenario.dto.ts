import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ScenarioConfigPatchSchema } from './scenario-config.schema.js';

const PatchScenarioSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  configUri: z.string().min(1).optional().meta({ description: 'URI of the scenario config blob (e.g. gs://…)' }),
  config: ScenarioConfigPatchSchema.optional().meta({
    description: 'Override leaves to merge. null resets that leaf to its default',
  }),
});

export class PatchScenarioDto extends createZodDto(PatchScenarioSchema) {}
