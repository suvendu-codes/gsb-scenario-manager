import { Module } from '@nestjs/common';
import { ScenariosModule } from '../scenarios/scenarios.module';
import { MAP_REPOSITORY } from './application/ports/map.repository';
import { ListMapScenariosUseCase } from './application/use-cases/list-map-scenarios.use-case';
import { FoundryMapRepository } from './infrastructure/foundry-map.repository';
import { MapsController } from './presentation/maps.controller';

@Module({
  imports: [ScenariosModule],
  controllers: [MapsController],
  providers: [
    ListMapScenariosUseCase,
    { provide: MAP_REPOSITORY, useClass: FoundryMapRepository },
  ],
  exports: [MAP_REPOSITORY],
})
export class MapsModule {}
