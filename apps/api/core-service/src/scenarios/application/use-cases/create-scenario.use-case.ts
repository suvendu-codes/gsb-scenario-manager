import { Inject, Injectable } from '@nestjs/common';
import type { NewScenario } from '../../domain/scenario.js';
import { SCENARIO_REPOSITORY, type ScenarioRepository } from '../ports/scenario.repository.js';

@Injectable()
export class CreateScenarioUseCase {
  constructor(
    @Inject(SCENARIO_REPOSITORY) private readonly scenarios: ScenarioRepository,
  ) {}

  async execute(input: NewScenario) {
    const scenario = await this.scenarios.create(input);
    return { scenario };
  }
}
