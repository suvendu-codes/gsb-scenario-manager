import { Inject, Injectable } from '@nestjs/common';
import { MapNotFoundError } from '../../domain/errors.js';
import { MAP_REPOSITORY, type MapRepository } from '../ports/map.repository.js';

@Injectable()
export class GetMapVersionUseCase {
  constructor(@Inject(MAP_REPOSITORY) private readonly maps: MapRepository) {}

  async execute(mapId: string) {
    const version = await this.maps.findVersion(mapId);
    if (!version) throw new MapNotFoundError(mapId);
    return version;
  }
}
