import { Module } from '@nestjs/common';
import { SCENARIO_REPOSITORY } from './application/ports/scenario.repository.port';
import { CreateScenarioUseCase } from './application/use-cases/create-scenario.use-case';
import { DeleteScenarioUseCase } from './application/use-cases/delete-scenario.use-case';
import { DuplicateScenarioUseCase } from './application/use-cases/duplicate-scenario.use-case';
import { GetScenarioConfigUseCase } from './application/use-cases/get-scenario-config.use-case';
import { ListScenariosUseCase } from './application/use-cases/list-scenarios.use-case';
import { UpdateScenarioUseCase } from './application/use-cases/update-scenario.use-case';
import { InMemoryScenarioRepository } from './infrastructure/adapters/in-memory-scenario.repository';
import { ScenariosController } from './presentation/scenarios.controller';

@Module({
  controllers: [ScenariosController],
  providers: [
    ListScenariosUseCase,
    GetScenarioConfigUseCase,
    CreateScenarioUseCase,
    UpdateScenarioUseCase,
    DuplicateScenarioUseCase,
    DeleteScenarioUseCase,
    {
      provide: SCENARIO_REPOSITORY,
      useClass: InMemoryScenarioRepository,
    },
  ],
})
export class ScenariosModule {}
