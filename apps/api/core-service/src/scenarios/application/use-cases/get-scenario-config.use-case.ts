import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  SCENARIO_REPOSITORY,
  type ScenarioRepositoryPort,
} from '../ports/scenario.repository.port';

@Injectable()
export class GetScenarioConfigUseCase {
  constructor(
    @Inject(SCENARIO_REPOSITORY)
    private readonly scenarios: ScenarioRepositoryPort,
  ) {}

  execute(id: string) {
    const scenario = this.scenarios.findById(id);
    if (!scenario) throw new NotFoundException(`Scenario ${id} not found`);

    return {
      scenarioId: scenario.id,
      url: `https://scenario-configs.example.com/${scenario.id}.json?X-Signature=${crypto.randomUUID().replace(/-/g, '')}&Expires=${Date.now() + 15 * 60_000}`,
      expiresInSeconds: 900,
    };
  }
}
