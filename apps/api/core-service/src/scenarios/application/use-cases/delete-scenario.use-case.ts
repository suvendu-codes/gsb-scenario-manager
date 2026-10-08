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
export class DeleteScenarioUseCase {
  constructor(
    @Inject(SCENARIO_REPOSITORY)
    private readonly scenarios: ScenarioRepositoryPort,
  ) {}

  execute(id: string) {
    const scenario = this.scenarios.findById(id);
    if (!scenario) throw new NotFoundException(`Scenario ${id} not found`);
    if (scenario.isLocked()) {
      throw new ConflictException(
        `Scenario is ${scenario.status} and cannot be deleted`,
      );
    }

    this.scenarios.delete(id);
    return { deleted: true as const, id };
  }
}
