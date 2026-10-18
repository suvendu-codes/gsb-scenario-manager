import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CloneScenarioSchema = z.object({
  id: z.string().min(1).meta({ description: 'ID of the scenario to clone' }),
  name: z
    .string()
    .min(1)
    .optional()
    .meta({ description: 'Name for the clone; defaults to "<source name> (copy)"' }),
});

export class CloneScenarioDto extends createZodDto(CloneScenarioSchema) {}
