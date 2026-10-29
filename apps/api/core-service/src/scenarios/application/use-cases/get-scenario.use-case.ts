import { Inject, Injectable } from '@nestjs/common';
import { ScenarioConfigNotFoundError, ScenarioNotFoundError } from '../../domain/errors.js';
import {
  SCENARIO_CONFIG_READER,
  type ScenarioConfigReader,
} from '../ports/scenario-config.reader.js';
import { SCENARIO_REPOSITORY, type ScenarioRepository } from '../ports/scenario.repository.js';

@Injectable()
export class GetScenarioUseCase {
  constructor(
    @Inject(SCENARIO_REPOSITORY) private readonly scenarios: ScenarioRepository,
    @Inject(SCENARIO_CONFIG_READER) private readonly configs: ScenarioConfigReader,
  ) {}

  async execute(id: string) {
    const scenario = await this.scenarios.findById(id);
    if (!scenario) throw new ScenarioNotFoundError(id);
    const version = await this.scenarios.findCurrentVersion(scenario);
    if (!version) throw new ScenarioConfigNotFoundError(id);
    const config = version.config ?? (await this.configs.read(version.configUri));
    return { scenario, configUri: version.configUri, config };
  }
}
