import { ProjectMap } from '../../domain/entities/map.entity';

export interface MapRepositoryPort {
  findByProject(projectId: string): ProjectMap[];
}

export const MAP_REPOSITORY = Symbol('MAP_REPOSITORY');
