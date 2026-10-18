import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateScenarioSchema = z.object({
  projectId: z.string().min(1),
  mapId: z.string().min(1),
  name: z.string().min(1),
  authorId: z.string().min(1),
  configUri: z.string().min(1).meta({ description: 'URI of the scenario config blob (e.g. gs://…)' }),
  createdBy: z.string().min(1),
});

export class CreateScenarioDto extends createZodDto(CreateScenarioSchema) {}
