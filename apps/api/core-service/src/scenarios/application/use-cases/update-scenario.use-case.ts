import { Inject, Injectable } from '@nestjs/common';
import { ScenarioConfigNotFoundError, ScenarioNotFoundError } from '../../domain/errors.js';
import { applyConfigPatch } from '../apply-config-patch.js';
import {
  SCENARIO_CONFIG_READER,
  type ScenarioConfigReader,
} from '../ports/scenario-config.reader.js';
import { SCENARIO_REPOSITORY, type ScenarioRepository } from '../ports/scenario.repository.js';

export interface UpdateScenarioInput {
  id: string;
  name?: string;
  configUri?: string;
  /** Overrides patch; a null leaf resets that override to its default. */
  config?: Record<string, unknown>;
  updatedBy: string;
}

@Injectable()
export class UpdateScenarioUseCase {
  constructor(
    @Inject(SCENARIO_REPOSITORY) private readonly scenarios: ScenarioRepository,
    @Inject(SCENARIO_CONFIG_READER) private readonly configs: ScenarioConfigReader,
  ) {}

  async execute(input: UpdateScenarioInput) {
    const scenario = await this.scenarios.findById(input.id);
    if (!scenario) throw new ScenarioNotFoundError(input.id);
    scenario.assertEditable();

    const current = await this.scenarios.findCurrentVersion(scenario);
    const configUri = input.configUri ?? current?.configUri;
    if (!configUri && !current?.config) throw new ScenarioConfigNotFoundError(input.id);

    const patched = input.config
      ? applyConfigPatch(current?.config ?? (await this.configs.read(configUri!)), input.config)
      : undefined;

    const updated = await this.scenarios.update(input.id, {
      name: input.name,
      configUri: configUri || undefined,
      config: patched?.config,
      updatedBy: input.updatedBy,
    });
    return { scenario: updated, changes: patched?.changes ?? [], modules: patched?.modules ?? [] };
  }
}
