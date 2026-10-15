import { Inject, Injectable } from '@nestjs/common';
import { ScenarioConfigNotFoundError, ScenarioNotFoundError } from '../../domain/errors';
import { SCENARIO_REPOSITORY, type ScenarioRepository } from '../ports/scenario.repository';

export interface UpdateScenarioInput {
  id: string;
  name?: string;
  configUri?: string;
  version: number;
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
    scenario.assertVersion(input.version);

    const configUri =
      input.configUri ?? (await this.scenarios.findCurrentVersion(scenario))?.configUri;
    if (!configUri) throw new ScenarioConfigNotFoundError(input.id);

    return this.scenarios.update(input.id, {
      name: input.name,
      configUri,
      updatedBy: input.updatedBy,
      expectedVersion: input.version,
    });
  }
}
