import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateScenarioSchema = z.object({
  name: z.string().min(1).optional(),
  configUri: z.string().min(1).optional().meta({ description: 'URI of the scenario config blob (e.g. gs://…)' }),
  updatedBy: z.string().min(1),
});

export class UpdateScenarioDto extends createZodDto(UpdateScenarioSchema) {}
