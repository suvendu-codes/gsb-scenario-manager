import { Inject, Injectable } from '@nestjs/common';
import { MapNotFoundError } from '../../domain/errors.js';
import { MAP_REPOSITORY, type MapRepository } from '../ports/map.repository.js';

@Injectable()
export class GetMapUseCase {
  constructor(@Inject(MAP_REPOSITORY) private readonly maps: MapRepository) {}

  async execute(mapId: string) {
    const map = await this.maps.findById(mapId);
    if (!map) throw new MapNotFoundError(mapId);
    return map;
  }
}
