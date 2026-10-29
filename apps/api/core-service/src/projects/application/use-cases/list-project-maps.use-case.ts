import { Inject, Injectable } from '@nestjs/common';
import {
  MAP_REPOSITORY,
  type MapRepository,
} from '../../../maps/application/ports/map.repository.js';
import { ProjectNotFoundError } from '../../domain/errors.js';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../ports/project.repository.js';

@Injectable()
export class ListProjectMapsUseCase {
  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository,
    @Inject(MAP_REPOSITORY) private readonly maps: MapRepository,
  ) {}

  async execute(projectId: string) {
    const projects = await this.projects.findAll();
    if (!projects.some((project) => project.id === projectId)) {
      throw new ProjectNotFoundError(projectId);
    }
    return this.maps.findByProject(projectId);
  }
}
