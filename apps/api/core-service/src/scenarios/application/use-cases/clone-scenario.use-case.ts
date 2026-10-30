import { Inject, Injectable, Logger } from '@nestjs/common';
import { ScenarioConfigNotFoundError, ScenarioNotFoundError } from '../../domain/errors.js';
import { SCENARIO_REPOSITORY, type ScenarioRepository } from '../ports/scenario.repository.js';
import { scenarioOperations } from '../../../telemetry/metrics.js';

@Injectable()
export class CloneScenarioUseCase {
  private readonly logger = new Logger(CloneScenarioUseCase.name);

  constructor(
    @Inject(SCENARIO_REPOSITORY) private readonly scenarios: ScenarioRepository,
  ) {}

  async execute(id: string, actor: string, name?: string) {
    const scenario = await this.scenarios.findById(id);
    if (!scenario) throw new ScenarioNotFoundError(id);
    const version = await this.scenarios.findCurrentVersion(scenario);
    if (!version) throw new ScenarioConfigNotFoundError(id);
    const created = await this.scenarios.create(
      scenario.clone(actor, version.configUri, name, version.config),
    );
    scenarioOperations.add(1, { operation: 'clone' });
    this.logger.log({
      event: 'scenario_cloned',
      scenario_id: created.id,
      source_scenario_id: id,
      created_by: actor,
    });
    return { scenario: created, configUri: version.configUri };
  }
}
