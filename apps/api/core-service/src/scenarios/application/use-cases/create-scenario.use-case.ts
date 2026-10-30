import { Inject, Injectable, Logger } from '@nestjs/common';
import type { NewScenario } from '../../domain/scenario.js';
import { SCENARIO_REPOSITORY, type ScenarioRepository } from '../ports/scenario.repository.js';
import { scenarioOperations } from '../../../telemetry/metrics.js';

@Injectable()
export class CreateScenarioUseCase {
  private readonly logger = new Logger(CreateScenarioUseCase.name);

  constructor(
    @Inject(SCENARIO_REPOSITORY) private readonly scenarios: ScenarioRepository,
  ) {}

  async execute(input: NewScenario) {
    const scenario = await this.scenarios.create(input);
    scenarioOperations.add(1, { operation: 'create' });
    this.logger.log({
      event: 'scenario_created',
      scenario_id: scenario.id,
      project_id: input.projectId,
      map_id: input.mapId,
      created_by: input.createdBy,
    });
    return { scenario };
  }
}
