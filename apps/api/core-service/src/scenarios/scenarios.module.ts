import { Module } from '@nestjs/common';
import { SCENARIO_REPOSITORY } from './application/ports/scenario.repository.js';
import { CreateScenarioUseCase } from './application/use-cases/create-scenario.use-case.js';
import { DeleteScenarioUseCase } from './application/use-cases/delete-scenario.use-case.js';
import { CloneScenarioUseCase } from './application/use-cases/clone-scenario.use-case.js';
import { GetScenarioUseCase } from './application/use-cases/get-scenario.use-case.js';
import { ListScenariosUseCase } from './application/use-cases/list-scenarios.use-case.js';
import { UpdateScenarioUseCase } from './application/use-cases/update-scenario.use-case.js';
import { InMemoryScenarioRepository } from './infrastructure/in-memory-scenario.repository.js';
import { ScenariosController } from './presentation/scenarios.controller.js';

@Module({
  controllers: [ScenariosController],
  providers: [
    ListScenariosUseCase,
    GetScenarioUseCase,
    CreateScenarioUseCase,
    UpdateScenarioUseCase,
    CloneScenarioUseCase,
    DeleteScenarioUseCase,
    { provide: SCENARIO_REPOSITORY, useClass: InMemoryScenarioRepository },
  ],
  exports: [SCENARIO_REPOSITORY],
})
export class ScenariosModule {}
