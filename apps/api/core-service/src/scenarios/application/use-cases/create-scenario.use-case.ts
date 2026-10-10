import { Inject, Injectable } from '@nestjs/common';
import type { NewScenario } from '../../domain/scenario';
import { SCENARIO_REPOSITORY, type ScenarioRepository } from '../ports/scenario.repository';

@Injectable()
export class CreateScenarioUseCase {
  constructor(
    @Inject(SCENARIO_REPOSITORY) private readonly scenarios: ScenarioRepository,
  ) {}

  execute(input: NewScenario) {
    return this.scenarios.create(input);
  }
}
