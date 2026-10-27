import { Inject, Injectable } from '@nestjs/common';
import { MapNotFoundError } from '../../domain/errors.js';
import { MAP_REPOSITORY, type MapRepository } from '../ports/map.repository.js';

@Injectable()
export class ListMapFoldersUseCase {
  constructor(@Inject(MAP_REPOSITORY) private readonly maps: MapRepository) {}

  async execute(mapId: string) {
    const folders = await this.maps.listFolders(mapId);
    if (!folders) throw new MapNotFoundError(mapId);
    return folders;
  }
}
