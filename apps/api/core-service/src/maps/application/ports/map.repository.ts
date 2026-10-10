import { ProjectMap } from '../../domain/map';

export interface MapRepository {
  findByProject(projectId: string): Promise<ProjectMap[]>;
}

export const MAP_REPOSITORY = Symbol('MAP_REPOSITORY');
