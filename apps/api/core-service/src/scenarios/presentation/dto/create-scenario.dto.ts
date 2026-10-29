import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ScenarioConfigSchema } from './scenario-config.schema.js';

const CreateScenarioSchema = z.object({
  name: z.string().min(1).max(100),
  project_id: z.uuid(),
  map_id: z.uuid(),
  map_version: z
    .number()
    .int()
    .positive()
    .meta({ description: 'Map version the scenario targets; maps are not versioned yet, so it is not persisted' }),
  config: ScenarioConfigSchema.meta({ description: 'Scenario config, stored in the local database' }),
});

export class CreateScenarioDto extends createZodDto(CreateScenarioSchema) {}
