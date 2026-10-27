import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { sortQuery } from '../../../common/dto/sort.dto.js';
import { SCENARIO_SORT_FIELDS } from '../../../scenarios/application/ports/scenario.repository.js';
import { ScenarioStatus } from '../../../scenarios/domain/scenario-status.js';

const ListScenariosSchema = z.object({
  status: z.enum(ScenarioStatus).optional(),
  sort: sortQuery(SCENARIO_SORT_FIELDS),
});

export class ListScenariosQuery extends createZodDto(ListScenariosSchema) {}
