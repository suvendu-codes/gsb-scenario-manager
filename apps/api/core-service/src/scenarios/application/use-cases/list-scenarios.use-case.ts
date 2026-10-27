import { Inject, Injectable } from '@nestjs/common';
import type { Pagination } from '../../../common/dto/pagination-query.dto.js';
import type { Sort } from '../../../common/dto/sort.dto.js';
import type { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface.js';
import { buildPaginationMeta } from '../../../common/interfaces/paginated-response.interface.js';
import type { Scenario } from '../../domain/scenario.js';
import { ScenarioStatus } from '../../domain/scenario-status.js';
import {
  SCENARIO_REPOSITORY,
  type ScenarioRepository,
  type ScenarioSortField,
} from '../ports/scenario.repository.js';

export interface ListScenariosInput extends Pagination {
  status?: ScenarioStatus;
  mapId?: string;
  projectId?: string;
  sort: Sort<ScenarioSortField>;
}

@Injectable()
export class ListScenariosUseCase {
  constructor(@Inject(SCENARIO_REPOSITORY) private readonly scenarios: ScenarioRepository) {}

  async execute(input: ListScenariosInput): Promise<PaginatedResponse<Scenario>> {
    const { items, total } = await this.scenarios.list(input);
    return { items, meta: buildPaginationMeta(total, input.page, input.limit) };
  }
}
