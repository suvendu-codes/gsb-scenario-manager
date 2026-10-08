import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SCENARIO_REPOSITORY,
  type ScenarioRepositoryPort,
} from '../ports/scenario.repository.port';

@Injectable()
export class UpdateScenarioUseCase {
  constructor(
    @Inject(SCENARIO_REPOSITORY)
    private readonly scenarios: ScenarioRepositoryPort,
  ) {}

  execute(id: string, patch: { name?: string }) {
    const scenario = this.scenarios.findById(id);
    if (!scenario) throw new NotFoundException(`Scenario ${id} not found`);
    if (scenario.isLocked()) {
      throw new ConflictException(
        `Scenario is ${scenario.status} and cannot be updated`,
      );
    }

    if (patch.name && patch.name !== scenario.name) {
      if (this.scenarios.nameTaken(scenario.mapId, patch.name)) {
        throw new ConflictException(
          `Scenario "${patch.name}" already exists on this map`,
        );
      }
      scenario.rename(patch.name);
    } else {
      scenario.touch();
    }

    return this.scenarios.save(scenario);
  }
}
