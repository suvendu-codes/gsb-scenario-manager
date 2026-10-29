import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { appConfig } from '../../../config.js';
import { parseScenarioConfigUri } from '../../domain/scenario-config-uri.js';
import { ScenarioConfigPatchSchema } from './scenario-config.schema.js';

const PatchScenarioSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  configUri: z
    .string()
    .refine((uri) => parseScenarioConfigUri(uri, appConfig.scenarioConfig) !== null, {
      message: 'must be a gs:// URI inside the configured scenario config location',
    })
    .optional()
    .meta({ description:
        'URI of the scenario config blob; must be gs://<configured bucket>/<configured prefix>…. Changing it makes that blob the new source of truth and discards any inline overrides; a `config` sent in the same request is applied on top of the new blob.' }),
  config: ScenarioConfigPatchSchema.optional().meta({
    description: 'Override leaves to merge. null resets that leaf to its default',
  }),
});

export class PatchScenarioDto extends createZodDto(PatchScenarioSchema) {}
