import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { MapFolder } from '../../domain/map-folder.js';
import type { ProjectMap } from '../../domain/map.js';
import type { MapVersion } from '../../domain/map-version.js';

const MapResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  width: z.number(),
  height: z.number(),
  updatedAt: z.string(),
});

export class MapResponseDto extends createZodDto(MapResponseSchema) {}

export const toMapResponse = (map: ProjectMap): MapResponseDto => ({
  id: map.id,
  projectId: map.projectId,
  name: map.name,
  width: map.width,
  height: map.height,
  updatedAt: map.updatedAt,
});

const MapVersionResponseSchema = z.object({
  mapId: z.string(),
  version: z.number().int(),
  updatedAt: z.string(),
  current: z.boolean(),
});

export class MapVersionResponseDto extends createZodDto(MapVersionResponseSchema) {}

const MapVersionListSchema = z.object({
  mapId: z.string(),
  versions: z.array(MapVersionResponseSchema),
});

export class MapVersionListDto extends createZodDto(MapVersionListSchema) {}

export const toMapVersionResponse = (version: MapVersion): MapVersionResponseDto => ({
  mapId: version.mapId,
  version: version.version,
  updatedAt: version.updatedAt,
  current: version.current,
});

export const toMapVersionList = (mapId: string, versions: MapVersion[]): MapVersionListDto => ({
  mapId,
  versions: versions.map(toMapVersionResponse),
});

const MapFolderResponseSchema = z.object({
  id: z.string(),
  mapId: z.string(),
  name: z.string(),
  path: z.string(),
  parentId: z.string().nullable(),
  updatedAt: z.string(),
});

export class MapFolderResponseDto extends createZodDto(MapFolderResponseSchema) {}

const MapFolderListSchema = z.object({
  mapId: z.string(),
  folders: z.array(MapFolderResponseSchema),
});

export class MapFolderListDto extends createZodDto(MapFolderListSchema) {}

export const toMapFolderResponse = (folder: MapFolder): MapFolderResponseDto => ({
  id: folder.id,
  mapId: folder.mapId,
  name: folder.name,
  path: folder.path,
  parentId: folder.parentId,
  updatedAt: folder.updatedAt,
});

export const toMapFolderList = (mapId: string, folders: MapFolder[]): MapFolderListDto => ({
  mapId,
  folders: folders.map(toMapFolderResponse),
});
