import { Module } from '@nestjs/common';
import { MAP_REPOSITORY } from './application/ports/map.repository.port';
import { ListMapsUseCase } from './application/use-cases/list-maps.use-case';
import { InMemoryMapRepository } from './infrastructure/adapters/in-memory-map.repository';
import { MapsController } from './presentation/maps.controller';

@Module({
  controllers: [MapsController],
  providers: [
    ListMapsUseCase,
    {
      provide: MAP_REPOSITORY,
      useClass: InMemoryMapRepository,
    },
  ],
})
export class MapsModule {}
