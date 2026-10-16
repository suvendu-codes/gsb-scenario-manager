import { Inject, Injectable } from '@nestjs/common';
import { ScenarioConfigNotFoundError, ScenarioNotFoundError } from '../../domain/errors.js';
import { SCENARIO_REPOSITORY, type ScenarioRepository } from '../ports/scenario.repository.js';

@Injectable()
export class GetScenarioUseCase {
  constructor(@Inject(SCENARIO_REPOSITORY) private readonly scenarios: ScenarioRepository) {}

  async execute(id: string) {
    const scenario = await this.scenarios.findById(id);
    if (!scenario) throw new ScenarioNotFoundError(id);
    const version = await this.scenarios.findCurrentVersion(scenario);
    if (!version) throw new ScenarioConfigNotFoundError(id);
    return {
      ...scenario,
      configUri: version.configUri,
    };
  }
}
