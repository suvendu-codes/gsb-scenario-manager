import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateScenarioUseCase } from './create-scenario.use-case';
import {
  SCENARIO_REPOSITORY,
  type ScenarioRepositoryPort,
} from '../ports/scenario.repository.port';

@Injectable()
export class DuplicateScenarioUseCase {
  constructor(
    @Inject(SCENARIO_REPOSITORY)
    private readonly scenarios: ScenarioRepositoryPort,
    private readonly createScenario: CreateScenarioUseCase,
  ) {}

  execute(id: string) {
    const source = this.scenarios.findById(id);
    if (!source) throw new NotFoundException(`Scenario ${id} not found`);

    let name = `${source.name} (copy)`;
    for (let n = 2; this.scenarios.nameTaken(source.mapId, name); n++) {
      name = `${source.name} (copy ${n})`;
    }
    return this.createScenario.execute(source.mapId, name);
  }
}
