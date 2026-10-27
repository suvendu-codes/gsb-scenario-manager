import { Inject, Injectable } from '@nestjs/common';
import { MapNotFoundError } from '../../domain/errors.js';
import { MAP_REPOSITORY, type MapRepository } from '../ports/map.repository.js';

@Injectable()
export class ListMapVersionsUseCase {
  constructor(@Inject(MAP_REPOSITORY) private readonly maps: MapRepository) {}

  async execute(mapId: string) {
    const versions = await this.maps.listVersions(mapId);
    if (!versions) throw new MapNotFoundError(mapId);
    return versions;
  }
}
