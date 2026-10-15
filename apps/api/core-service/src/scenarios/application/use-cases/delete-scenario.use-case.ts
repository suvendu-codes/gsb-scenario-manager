import { Inject, Injectable } from '@nestjs/common';
import { ScenarioNotFoundError } from '../../domain/errors';
import { SCENARIO_REPOSITORY, type ScenarioRepository } from '../ports/scenario.repository';

@Injectable()
export class DeleteScenarioUseCase {
  constructor(
    @Inject(SCENARIO_REPOSITORY) private readonly scenarios: ScenarioRepository,
  ) {}

  async execute(id: string) {
    const scenario = await this.scenarios.findById(id);
    if (!scenario) throw new ScenarioNotFoundError(id);
    scenario.assertDeletable();
    await this.scenarios.delete(id);
  }
}
