import { Inject, Injectable, Logger } from '@nestjs/common';
import { ScenarioConfigNotFoundError, ScenarioNotFoundError } from '../../domain/errors.js';
import { applyConfigPatch } from '../apply-config-patch.js';
import {
  SCENARIO_CONFIG_READER,
  type ScenarioConfigReader,
} from '../ports/scenario-config.reader.js';
import { SCENARIO_REPOSITORY, type ScenarioRepository } from '../ports/scenario.repository.js';
import { scenarioOperations } from '../../../telemetry/metrics.js';

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
  private readonly logger = new Logger(UpdateScenarioUseCase.name);

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

    // A new configUri replaces the inline body (see nextStoredConfig), so the patch applies to that blob.
    const repointed = input.configUri !== undefined && input.configUri !== current?.configUri;
    // Only fetched when no inline body will be used; the patch itself is applied under a row lock in the repository.
    const baseline =
      input.config && (repointed || !current?.config) ? await this.configs.read(configUri!) : undefined;

    let patched: ReturnType<typeof applyConfigPatch> | undefined;
    const updated = await this.scenarios.update(input.id, {
      name: input.name,
      configUri: configUri || undefined,
      patchConfig: input.config
        ? (stored) => {
            patched = applyConfigPatch(stored ?? baseline ?? {}, input.config!);
            return patched.config;
          }
        : undefined,
      updatedBy: input.updatedBy,
    });
    scenarioOperations.add(1, { operation: 'update' });
    this.logger.log({
      event: 'scenario_updated',
      scenario_id: input.id,
      updated_by: input.updatedBy,
      renamed: input.name !== undefined,
      config_repointed: repointed,
      config_changes: patched?.changes.length ?? 0,
    });
    return { scenario: updated, changes: patched?.changes ?? [], modules: patched?.modules ?? [] };
  }
}
