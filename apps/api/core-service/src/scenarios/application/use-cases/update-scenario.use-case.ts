import { Inject, Injectable } from '@nestjs/common';
import { ScenarioConfigNotFoundError, ScenarioNotFoundError } from '../../domain/errors.js';
import { SCENARIO_REPOSITORY, type ScenarioRepository } from '../ports/scenario.repository.js';

export interface UpdateScenarioInput {
  id: string;
  name?: string;
  configUri?: string;
  updatedBy: string;
}

@Injectable()
export class UpdateScenarioUseCase {
  constructor(
    @Inject(SCENARIO_REPOSITORY) private readonly scenarios: ScenarioRepository,
  ) {}

  async execute(input: UpdateScenarioInput) {
    const scenario = await this.scenarios.findById(input.id);
    if (!scenario) throw new ScenarioNotFoundError(input.id);
    scenario.assertEditable();

    const configUri =
      input.configUri ?? (await this.scenarios.findCurrentVersion(scenario))?.configUri;
    if (!configUri) throw new ScenarioConfigNotFoundError(input.id);

    const updated = await this.scenarios.update(input.id, {
      name: input.name,
      configUri,
      updatedBy: input.updatedBy,
    });
    return { scenario: updated, configUri };
  }
}
