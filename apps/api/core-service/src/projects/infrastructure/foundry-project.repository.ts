import { Injectable } from '@nestjs/common';
import { UpstreamUnavailableError } from '../../common/domain/domain-error';
import { appConfig } from '../../config';
import { ProjectRepository } from '../application/ports/project.repository';
import { Project } from '../domain/project';

@Injectable()
export class FoundryProjectRepository implements ProjectRepository {
  async findAll(): Promise<Project[]> {
    const base = appConfig.mapApi.replace(/\/$/, '');
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
    id: String(r.id ?? r.projectId ?? ''),
    name: String(r.name ?? 'Unnamed project'),
    mapCount: Number(r.mapCount ?? r.map_count ?? 0),
    createdAt: String(r.createdAt ?? r.created_at ?? new Date().toISOString()),
  };
}
