import { Module } from '@nestjs/common';
import { ScenariosModule } from '../scenarios/scenarios.module.js';
import { MAP_REPOSITORY } from './application/ports/map.repository.js';
import { GetMapFolderUseCase } from './application/use-cases/get-map-folder.use-case.js';
import { GetMapVersionAtUseCase } from './application/use-cases/get-map-version-at.use-case.js';
import { GetMapVersionUseCase } from './application/use-cases/get-map-version.use-case.js';
import { GetMapUseCase } from './application/use-cases/get-map.use-case.js';
import { ListMapFoldersUseCase } from './application/use-cases/list-map-folders.use-case.js';
import { ListMapScenariosUseCase } from './application/use-cases/list-map-scenarios.use-case.js';
import { ListMapVersionsUseCase } from './application/use-cases/list-map-versions.use-case.js';
import { InMemoryMapRepository } from './infrastructure/in-memory-map.repository.js';
import { MapsController } from './presentation/maps.controller.js';

@Module({
  imports: [ScenariosModule],
  controllers: [MapsController],
  providers: [
    GetMapUseCase,
    GetMapVersionUseCase,
    ListMapVersionsUseCase,
    GetMapVersionAtUseCase,
    ListMapFoldersUseCase,
    GetMapFolderUseCase,
    ListMapScenariosUseCase,
    { provide: MAP_REPOSITORY, useClass: InMemoryMapRepository },
  ],
  exports: [MAP_REPOSITORY],
})
export class MapsModule {}
