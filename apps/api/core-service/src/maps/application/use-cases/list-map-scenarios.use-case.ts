import { Inject, Injectable } from '@nestjs/common';
import { Sort } from '../../../common/dto/sort.dto';
import {
  SCENARIO_REPOSITORY,
  type ScenarioRepository,
  type ScenarioSortField,
} from '../../../scenarios/application/ports/scenario.repository';
import { ScenarioStatus } from '../../../scenarios/domain/scenario-status';

export interface ListMapScenariosInput {
  mapId: string;
  status?: ScenarioStatus;
  sort: Sort<ScenarioSortField>;
}

@Injectable()
export class ListMapScenariosUseCase {
  constructor(
    @Inject(SCENARIO_REPOSITORY)
    private readonly scenarios: ScenarioRepository,
  ) {}

  execute({ mapId, status, sort }: ListMapScenariosInput) {
    return this.scenarios.listByMap(mapId, { status, sort });
  }
}
