import { Inject, Injectable, Logger } from '@nestjs/common';
import { ScenarioNotFoundError } from '../../domain/errors.js';
import { SCENARIO_REPOSITORY, type ScenarioRepository } from '../ports/scenario.repository.js';
import { scenarioOperations } from '../../../telemetry/metrics.js';

@Injectable()
export class DeleteScenarioUseCase {
  private readonly logger = new Logger(DeleteScenarioUseCase.name);

  constructor(
    @Inject(SCENARIO_REPOSITORY) private readonly scenarios: ScenarioRepository,
  ) {}

  async execute(id: string) {
    const scenario = await this.scenarios.findById(id);
    if (!scenario) throw new ScenarioNotFoundError(id);
    scenario.assertDeletable();
    await this.scenarios.delete(id);
    scenarioOperations.add(1, { operation: 'delete' });
    this.logger.log({ event: 'scenario_deleted', scenario_id: id });
  }
}
