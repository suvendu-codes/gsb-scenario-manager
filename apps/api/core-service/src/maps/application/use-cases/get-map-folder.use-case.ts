import { Inject, Injectable } from '@nestjs/common';
import { MapFolderNotFoundError, MapNotFoundError } from '../../domain/errors.js';
import { MAP_REPOSITORY, type MapRepository } from '../ports/map.repository.js';

@Injectable()
export class GetMapFolderUseCase {
  constructor(@Inject(MAP_REPOSITORY) private readonly maps: MapRepository) {}

  async execute(mapId: string, folderId: string) {
    const map = await this.maps.findById(mapId);
    if (!map) throw new MapNotFoundError(mapId);
    const folder = await this.maps.findFolder(mapId, folderId);
    if (!folder) throw new MapFolderNotFoundError(mapId, folderId);
    return folder;
  }
}
