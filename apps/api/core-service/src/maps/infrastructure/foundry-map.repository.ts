import { Injectable } from '@nestjs/common';
import { UpstreamUnavailableError } from '../../common/domain/domain-error';
import { appConfig } from '../../config';
import { MapRepository } from '../application/ports/map.repository';
import { ProjectMap } from '../domain/map';

@Injectable()
export class FoundryMapRepository implements MapRepository {
  async findByProject(projectId: string): Promise<ProjectMap[]> {
    const base = appConfig.mapApi.replace(/\/$/, '');
    const res = await fetch(
      `${base}/projects/${encodeURIComponent(projectId)}/maps`,
    );
    if (!res.ok) {
      throw new UpstreamUnavailableError('Foundry maps', res.status);
    }
    const data: unknown = await res.json();
    return Array.isArray(data)
      ? data.map((row) => normalizeMap(row, projectId))
      : [];
  }
}

function normalizeMap(row: unknown, projectId: string): ProjectMap {
  const r = row as Record<string, unknown>;
  return {
    id: String(r.id ?? r.mapId ?? r.map_id ?? ''),
    projectId: String(r.projectId ?? r.project_id ?? projectId),
    name: String(r.name ?? 'Unnamed map'),
    width: Number(r.width ?? 0),
    height: Number(r.height ?? 0),
    updatedAt: String(r.updatedAt ?? r.updated_at ?? new Date().toISOString()),
  };
}
