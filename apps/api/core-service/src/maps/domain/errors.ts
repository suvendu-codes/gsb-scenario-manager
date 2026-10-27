import { DomainError } from '../../common/domain/domain-error.js';

export class MapNotFoundError extends DomainError {
  constructor(mapId: string) {
    super(`Map ${mapId} not found`, 'not_found', 'map_not_found');
  }
}

export class MapVersionNotFoundError extends DomainError {
  constructor(mapId: string, mapVersion: number) {
    super(`Map ${mapId} has no version ${mapVersion}`, 'not_found', 'map_version_not_found');
  }
}

export class MapFolderNotFoundError extends DomainError {
  constructor(mapId: string, folderId: string) {
    super(`Map ${mapId} has no folder ${folderId}`, 'not_found', 'map_folder_not_found');
  }
}
