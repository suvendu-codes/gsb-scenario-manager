import { MapFolder } from '../../domain/map-folder.js';
import { MapVersion } from '../../domain/map-version.js';
import { ProjectMap } from '../../domain/map.js';

export interface MapRepository {
  findByProject(projectId: string): Promise<ProjectMap[]>;
  /** Null when the map doesn't exist upstream. */
  findById(mapId: string): Promise<ProjectMap | null>;
  /** The current version. Null when the map doesn't exist. */
  findVersion(mapId: string): Promise<MapVersion | null>;
  /** Null when the map doesn't exist. An existing map may have an empty list. */
  listVersions(mapId: string): Promise<MapVersion[] | null>;
  findVersionAt(mapId: string, version: number): Promise<MapVersion | null>;
  /** Null when the map doesn't exist. An existing map may have an empty list. */
  listFolders(mapId: string): Promise<MapFolder[] | null>;
  findFolder(mapId: string, folderId: string): Promise<MapFolder | null>;
}

export const MAP_REPOSITORY = Symbol('MAP_REPOSITORY');
