import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Scenario } from '../../domain/entities/scenario.entity';
import {
  SCENARIO_REPOSITORY,
  type ScenarioRepositoryPort,
} from '../ports/scenario.repository.port';

@Injectable()
export class CreateScenarioUseCase {
  constructor(
    @Inject(SCENARIO_REPOSITORY)
    private readonly scenarios: ScenarioRepositoryPort,
  ) {}

  execute(mapId: string, name: string): Scenario {
    if (this.scenarios.nameTaken(mapId, name)) {
      throw new ConflictException(
        `Scenario "${name}" already exists on this map`,
      );
    }

    return this.scenarios.save(Scenario.create(mapId, name));
  }
}
