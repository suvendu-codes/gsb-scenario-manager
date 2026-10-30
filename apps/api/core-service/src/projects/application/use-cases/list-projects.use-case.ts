import { Inject, Injectable } from '@nestjs/common';
import { PROJECT_REPOSITORY, type ProjectRepository } from '../ports/project.repository.js';

@Injectable()
export class ListProjectsUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository) {}

  async execute() {
    const projects = await this.projects.findAll();
    return {
      projects: projects.map((project) => ({
        project_id: project.id,
        name: project.name,
        description: project.description,
      })),
    };
  }
}
