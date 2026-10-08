import { Inject, Injectable } from '@nestjs/common';
import {
  Scenario,
  type ScenarioStatus,
} from '../../domain/entities/scenario.entity';
import {
  SCENARIO_REPOSITORY,
  type ScenarioRepositoryPort,
} from '../ports/scenario.repository.port';

@Injectable()
export class ListScenariosUseCase {
  constructor(
    @Inject(SCENARIO_REPOSITORY)
    private readonly scenarios: ScenarioRepositoryPort,
  ) {}

  execute(
    mapId: string,
    status?: ScenarioStatus,
    sort = '-updatedAt',
  ): Scenario[] {
    const desc = sort.startsWith('-');
    const key = sort.replace('-', '') as 'name' | 'createdAt' | 'updatedAt';
    return this.scenarios
      .findByMap(mapId)
      .filter((scenario) => !status || scenario.status === status)
      .sort(
        (a, b) =>
          (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (desc ? -1 : 1),
      );
  }
}
