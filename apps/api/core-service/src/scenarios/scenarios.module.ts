import { Module } from '@nestjs/common';
import { SCENARIO_CONFIG_READER } from './application/ports/scenario-config.reader.js';
import { SCENARIO_REPOSITORY } from './application/ports/scenario.repository.js';
import { CreateScenarioUseCase } from './application/use-cases/create-scenario.use-case.js';
import { DeleteScenarioUseCase } from './application/use-cases/delete-scenario.use-case.js';
import { CloneScenarioUseCase } from './application/use-cases/clone-scenario.use-case.js';
import { GetScenarioUseCase } from './application/use-cases/get-scenario.use-case.js';
import { ListScenariosUseCase } from './application/use-cases/list-scenarios.use-case.js';
import { UpdateScenarioUseCase } from './application/use-cases/update-scenario.use-case.js';
import { GcsScenarioConfigReader } from './infrastructure/gcs-scenario-config.reader.js';
import { DrizzleScenarioRepository } from './infrastructure/drizzle-scenario.repository.js';
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
    { provide: SCENARIO_REPOSITORY, useClass: DrizzleScenarioRepository },
    { provide: SCENARIO_CONFIG_READER, useClass: GcsScenarioConfigReader },
  ],
  exports: [SCENARIO_REPOSITORY],
})
export class ScenariosModule {}
