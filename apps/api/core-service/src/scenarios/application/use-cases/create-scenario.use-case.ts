import { Inject, Injectable } from '@nestjs/common';
import { ScenarioConfigRequiredError } from '../../domain/errors.js';
import type { NewScenario } from '../../domain/scenario.js';
import { SCENARIO_REPOSITORY, type ScenarioRepository } from '../ports/scenario.repository.js';

@Injectable()
export class CreateScenarioUseCase {
  constructor(
    @Inject(SCENARIO_REPOSITORY) private readonly scenarios: ScenarioRepository,
  ) {}

  async execute(input: NewScenario) {
    // A draft with neither an inline body nor a blob could never be read, cloned or patched.
    if (!input.config && !input.configUri) throw new ScenarioConfigRequiredError();
    const scenario = await this.scenarios.create(input);
    return { scenario };
  }
}
