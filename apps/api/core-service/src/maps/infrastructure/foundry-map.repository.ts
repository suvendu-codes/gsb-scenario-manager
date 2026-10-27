import { Injectable } from '@nestjs/common';
import { UpstreamUnavailableError } from '../../common/domain/domain-error.js';
import { appConfig, requireConfig } from '../../config.js';
import { MapRepository } from '../application/ports/map.repository.js';
import { MapFolder } from '../domain/map-folder.js';
import { ProjectMap } from '../domain/map.js';
import { MapVersion } from '../domain/map-version.js';

@Injectable()
export class FoundryMapRepository implements MapRepository {
  async findByProject(projectId: string): Promise<ProjectMap[]> {
    const data = await this.request(`/projects/${encodeURIComponent(projectId)}/maps`, 'throw');
    return Array.isArray(data) ? data.map((row) => normalizeMap(row, projectId)) : [];
  }

  async findById(mapId: string): Promise<ProjectMap | null> {
    const data = await this.request(`/maps/${encodeURIComponent(mapId)}`, 'null');
    return data ? normalizeMap(data, '') : null;
  }

  async findVersion(mapId: string): Promise<MapVersion | null> {
    const data = await this.request(`/maps/${encodeURIComponent(mapId)}/version`, 'null');
    return data ? normalizeVersion(data, mapId, true) : null;
  }

  async listVersions(mapId: string): Promise<MapVersion[] | null> {
    const data = await this.request(`/maps/${encodeURIComponent(mapId)}/versions`, 'null');
    if (data == null) return null;
    const versions = rows(data, 'versions').map((row) => normalizeVersion(row, mapId, false));
    if (versions.length > 0 && !versions.some((version) => version.current)) {
      const latest = versions.reduce((best, version) =>
        version.version > best.version ? version : best,
      );
      latest.current = true;
    }
    return versions;
  }

  async findVersionAt(mapId: string, version: number): Promise<MapVersion | null> {
    const data = await this.request(
      `/maps/${encodeURIComponent(mapId)}/versions/${version}`,
      'null',
    );
    return data ? normalizeVersion(data, mapId, false) : null;
  }

  async listFolders(mapId: string): Promise<MapFolder[] | null> {
    const data = await this.request(`/maps/${encodeURIComponent(mapId)}/folders`, 'null');
    if (data == null) return null;
    return rows(data, 'folders').map((row) => normalizeFolder(row, mapId));
  }

  async findFolder(mapId: string, folderId: string): Promise<MapFolder | null> {
    const data = await this.request(
      `/maps/${encodeURIComponent(mapId)}/folders/${encodeURIComponent(folderId)}`,
      'null',
    );
    return data ? normalizeFolder(data, mapId) : null;
  }

  /** `throw` keeps the old project-maps behavior: a 404 is upstream failure, not an empty list. */
  private async request(path: string, missing: 'throw' | 'null'): Promise<unknown | null> {
    const base = requireConfig(appConfig.mapApi, 'MAP_API').replace(/\/$/, '');
    const res = await fetch(`${base}${path}`);
    if (res.status === 404) {
      if (missing === 'throw') throw new UpstreamUnavailableError('Foundry maps', res.status);
      return null;
    }
    if (!res.ok) throw new UpstreamUnavailableError('Foundry maps', res.status);
    return res.json();
  }
}

function rows(body: unknown, key: string): unknown[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object') {
    const value = (body as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

export function normalizeMap(row: unknown, projectId: string): ProjectMap {
  const r = row as Record<string, unknown>;
  return Object.assign(new ProjectMap(), {
    id: String(r.id ?? r.mapId ?? r.map_id ?? ''),
    projectId: String(r.projectId ?? r.project_id ?? projectId),
    name: String(r.name ?? 'Unnamed map'),
    width: Number(r.width ?? 0),
    height: Number(r.height ?? 0),
    updatedAt: String(r.updatedAt ?? r.updated_at ?? new Date().toISOString()),
  });
}

export function normalizeVersion(row: unknown, mapId: string, fallbackCurrent: boolean): MapVersion {
  const r = row as Record<string, unknown>;
  const parsed = typeof r.version === 'number' ? r.version : Number(r.version);
  const version = Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  return Object.assign(new MapVersion(), {
    mapId: String(r.mapId ?? r.map_id ?? mapId),
    version,
    updatedAt: String(r.updatedAt ?? r.updated_at ?? new Date().toISOString()),
    current: typeof r.current === 'boolean' ? r.current : fallbackCurrent,
  });
}

export function normalizeFolder(row: unknown, mapId: string): MapFolder {
  const r = row as Record<string, unknown>;
  const parent = r.parentId ?? r.parent_id;
  return Object.assign(new MapFolder(), {
    id: String(r.id ?? r.folderId ?? r.folder_id ?? ''),
    mapId: String(r.mapId ?? r.map_id ?? mapId),
    name: String(r.name ?? 'Unnamed folder'),
    path: String(r.path ?? ''),
    parentId: parent == null || parent === '' ? null : String(parent),
    updatedAt: String(r.updatedAt ?? r.updated_at ?? new Date().toISOString()),
  });
}
