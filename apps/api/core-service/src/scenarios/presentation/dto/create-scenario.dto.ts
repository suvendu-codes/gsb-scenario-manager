import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CONFIG_URI_REGEX = /^gs:\/\/[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]\/\S+$/;

const CreateScenarioSchema = z.object({
  projectId: z.uuid(),
  mapId: z.uuid(),
  name: z.string().min(1).max(100),
  authorId: z.string().min(1),
  configUri: z
    .string()
    .regex(CONFIG_URI_REGEX, 'configUri must be a gs://<bucket>/<object> URI')
    .meta({ description: 'URI of the scenario config blob (e.g. gs://bucket/path/config.json)' }),
  createdBy: z.string().min(1),
});

export class CreateScenarioDto extends createZodDto(CreateScenarioSchema) {}
