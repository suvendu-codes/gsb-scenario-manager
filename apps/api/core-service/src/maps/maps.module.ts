import { Module } from '@nestjs/common';
import { ScenariosModule } from '../scenarios/scenarios.module.js';
import { GetMapFolderUseCase } from './application/use-cases/get-map-folder.use-case.js';
import { GetMapVersionAtUseCase } from './application/use-cases/get-map-version-at.use-case.js';
import { GetMapVersionUseCase } from './application/use-cases/get-map-version.use-case.js';
import { GetMapUseCase } from './application/use-cases/get-map.use-case.js';
import { ListMapFoldersUseCase } from './application/use-cases/list-map-folders.use-case.js';
import { ListMapScenariosUseCase } from './application/use-cases/list-map-scenarios.use-case.js';
import { ListMapVersionsUseCase } from './application/use-cases/list-map-versions.use-case.js';
import { mapRepositoryProvider } from './infrastructure/map-repository.provider.js';
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
    mapRepositoryProvider,
  ],
  exports: [mapRepositoryProvider],
})
export class MapsModule {}
