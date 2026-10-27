import { Inject, Injectable } from '@nestjs/common';
import { MapNotFoundError, MapVersionNotFoundError } from '../../domain/errors.js';
import { MAP_REPOSITORY, type MapRepository } from '../ports/map.repository.js';

@Injectable()
export class GetMapVersionAtUseCase {
  constructor(@Inject(MAP_REPOSITORY) private readonly maps: MapRepository) {}

  async execute(mapId: string, version: number) {
    const map = await this.maps.findById(mapId);
    if (!map) throw new MapNotFoundError(mapId);
    const found = await this.maps.findVersionAt(mapId, version);
    if (!found) throw new MapVersionNotFoundError(mapId, version);
    return found;
  }
}
