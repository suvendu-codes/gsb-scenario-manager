import { Module } from '@nestjs/common';
import { SCENARIO_REPOSITORY } from './application/ports/scenario.repository';
import { CreateScenarioUseCase } from './application/use-cases/create-scenario.use-case';
import { DeleteScenarioUseCase } from './application/use-cases/delete-scenario.use-case';
import { DuplicateScenarioUseCase } from './application/use-cases/duplicate-scenario.use-case';
import { GetScenarioUseCase } from './application/use-cases/get-scenario.use-case';
import { UpdateScenarioUseCase } from './application/use-cases/update-scenario.use-case';
import { DrizzleScenarioRepository } from './infrastructure/drizzle-scenario.repository';
import { ScenariosController } from './presentation/scenarios.controller';

@Module({
  controllers: [ScenariosController],
  providers: [
    GetScenarioUseCase,
    CreateScenarioUseCase,
    UpdateScenarioUseCase,
    DuplicateScenarioUseCase,
    DeleteScenarioUseCase,
    { provide: SCENARIO_REPOSITORY, useClass: DrizzleScenarioRepository },
  ],
  exports: [SCENARIO_REPOSITORY],
})
export class ScenariosModule {}
