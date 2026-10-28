import { Logger, type FactoryProvider } from '@nestjs/common';
import { appConfig } from '../../config.js';
import { MAP_REPOSITORY, type MapRepository } from '../application/ports/map.repository.js';
import { FoundryMapRepository } from './foundry-map.repository.js';
import { InMemoryMapRepository } from './in-memory-map.repository.js';

/** Foundry when MAP_API is set, otherwise the in-memory mock data. */
export function createMapRepository(mapApi: string | undefined): MapRepository {
  return mapApi ? new FoundryMapRepository() : new InMemoryMapRepository();
}

export const mapRepositoryProvider: FactoryProvider<MapRepository> = {
  provide: MAP_REPOSITORY,
  useFactory: () => {
    const repository = createMapRepository(appConfig.mapApi);
    new Logger('MapsModule').log(`Map repository: ${repository.constructor.name}`);
    return repository;
  },
};
