import { Injectable } from '@nestjs/common';
import { UpstreamUnavailableError } from '../../common/domain/domain-error.js';
import { appConfig, requireConfig } from '../../config.js';
import { ProjectRepository } from '../application/ports/project.repository.js';
import { Project } from '../domain/project.js';

@Injectable()
export class FoundryProjectRepository implements ProjectRepository {
  async findAll(): Promise<Project[]> {
    const base = requireConfig(appConfig.mapApi, 'MAP_API').replace(/\/$/, '');
    const res = await fetch(`${base}/projects`);
    if (!res.ok) {
      throw new UpstreamUnavailableError('Foundry projects', res.status);
    }
    const data: unknown = await res.json();
    return Array.isArray(data) ? data.map(normalizeProject) : [];
  }
}

function normalizeProject(row: unknown): Project {
  const r = row as Record<string, unknown>;
  return {
    id: String(r.id ?? r.projectId ?? r.project_id ?? ''),
    name: String(r.name ?? 'Unnamed project'),
    description: String(r.description ?? ''),
    mapCount: Number(r.mapCount ?? r.map_count ?? 0),
    createdAt: String(r.createdAt ?? r.created_at ?? new Date().toISOString()),
  };
}
