import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { MapRepository } from '../application/ports/map.repository.js';
import { MapFolder } from '../domain/map-folder.js';
import { ProjectMap } from '../domain/map.js';
import { MapVersion } from '../domain/map-version.js';

const DUMMY_MAP_NAMES = ['Ecom RTP Baseline', 'Multi-Order MSIO'];

interface RecordedMap {
  map: ProjectMap;
  versions: MapVersion[];
  folders: MapFolder[];
}

function copyMap(map: ProjectMap): ProjectMap {
  return Object.assign(new ProjectMap(), map);
}

function copyVersion(version: MapVersion): MapVersion {
  return Object.assign(new MapVersion(), version);
}

function copyFolder(folder: MapFolder): MapFolder {
  return Object.assign(new MapFolder(), folder);
}

/** Versions 1 and 2, with 2 current, so a map lines up with the PPS fixtures. */
function versionsFor(mapId: string, updatedAt: string): MapVersion[] {
  return [
    Object.assign(new MapVersion(), { mapId, version: 1, updatedAt, current: false }),
    Object.assign(new MapVersion(), { mapId, version: 2, updatedAt, current: true }),
  ];
}

/** A root layout folder and a child zones folder. */
function foldersFor(mapId: string, updatedAt: string): MapFolder[] {
  return [
    Object.assign(new MapFolder(), {
      id: 'layout',
      mapId,
      name: 'Layout',
      path: 'layout',
      parentId: null,
      updatedAt,
    }),
    Object.assign(new MapFolder(), {
      id: 'zones',
      mapId,
      name: 'Zones',
      path: 'layout/zones',
      parentId: 'layout',
      updatedAt,
    }),
  ];
}

function record(map: ProjectMap): RecordedMap {
  return { map, versions: versionsFor(map.id, map.updatedAt), folders: foldersFor(map.id, map.updatedAt) };
}

function dummyMap(projectId: string, name: string): ProjectMap {
  return Object.assign(new ProjectMap(), {
    id: randomUUID(),
    projectId,
    name,
    width: 0,
    height: 0,
    updatedAt: new Date().toISOString(),
  });
}

@Injectable()
export class InMemoryMapRepository implements MapRepository {
  private readonly records: RecordedMap[] = [
    record(
      Object.assign(new ProjectMap(), {
        id: 'm1',
        projectId: 'p1',
        name: 'Ecom RTP Baseline',
        width: 100,
        height: 40,
        updatedAt: '2026-02-01T00:00:00.000Z',
      }),
    ),
  ];

  async findByProject(projectId: string): Promise<ProjectMap[]> {
    // Seed random-id dummy maps on first lookup so every project has some;
    // ids then stay stable for the life of the process.
    if (!this.records.some((row) => row.map.projectId === projectId)) {
      this.records.push(...DUMMY_MAP_NAMES.map((name) => record(dummyMap(projectId, name))));
    }
    return this.records.filter((row) => row.map.projectId === projectId).map((row) => copyMap(row.map));
  }

  async findById(mapId: string): Promise<ProjectMap | null> {
    const row = this.row(mapId);
    return row ? copyMap(row.map) : null;
  }

  async findVersion(mapId: string): Promise<MapVersion | null> {
    const row = this.row(mapId);
    if (!row) return null;
    const current = row.versions.find((version) => version.current) ?? row.versions.at(-1);
    return current ? copyVersion(current) : null;
  }

  async listVersions(mapId: string): Promise<MapVersion[] | null> {
    const row = this.row(mapId);
    return row ? row.versions.map(copyVersion) : null;
  }

  async findVersionAt(mapId: string, version: number): Promise<MapVersion | null> {
    const row = this.row(mapId);
    const found = row?.versions.find((item) => item.version === version);
    return found ? copyVersion(found) : null;
  }

  async listFolders(mapId: string): Promise<MapFolder[] | null> {
    const row = this.row(mapId);
    return row ? row.folders.map(copyFolder) : null;
  }

  async findFolder(mapId: string, folderId: string): Promise<MapFolder | null> {
    const row = this.row(mapId);
    const found = row?.folders.find((folder) => folder.id === folderId);
    return found ? copyFolder(found) : null;
  }

  add(map: ProjectMap) {
    this.records.push(record(map));
  }

  private row(mapId: string): RecordedMap | undefined {
    return this.records.find((row) => row.map.id === mapId);
  }
}
