import { Injectable } from '@nestjs/common';
import { ProjectRepository } from '../application/ports/project.repository';
import { Project } from '../domain/project';

@Injectable()
export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects: Project[] = [];

  async findAll(): Promise<Project[]> {
    return this.projects.map((project) => Object.assign(new Project(), project));
  }

  add(project: Project) {
    this.projects.push(project);
  }
}
