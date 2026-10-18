import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { sortQuery } from '../../../common/dto/sort.dto.js';
import { SCENARIO_SORT_FIELDS } from '../../application/ports/scenario.repository.js';
import { ScenarioStatus } from '../../domain/scenario-status.js';

const ListAllScenariosSchema = z.object({
  // `all` is the explicit "no status filter" value.
  status: z.enum([...Object.values(ScenarioStatus), 'all']).optional(),
  map_id: z.uuid().optional(),
  project_id: z.uuid().optional(),
  sort: sortQuery(SCENARIO_SORT_FIELDS),
  limit: z.coerce.number().int().min(1).max(100).optional().meta({ default: 20 }),
  cursor: z.string().optional().meta({ description: 'Opaque `next_cursor` from the previous response' }),
});

export class ListAllScenariosQuery extends createZodDto(ListAllScenariosSchema) {}
