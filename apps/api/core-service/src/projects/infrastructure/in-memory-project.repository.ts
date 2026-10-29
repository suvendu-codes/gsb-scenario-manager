import { Injectable } from '@nestjs/common';
import { ProjectRepository } from '../application/ports/project.repository.js';
import { Project } from '../domain/project.js';

function dummyProject(id: string, name: string, description: string): Project {
  return Object.assign(new Project(), {
    id,
    name,
    description,
    mapCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  });
}

@Injectable()
export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects: Project[] = [
    dummyProject('69bed8af82b48a28a231db1b', 'Coupang Daegu', 'RTP ecom + retail'),
    dummyProject('b7e2c41a90f35d68e1a04c93', 'H&M Canada', 'Relay coexistence'),
  ];

  async findAll(): Promise<Project[]> {
    return this.projects.map((project) => Object.assign(new Project(), project));
  }

  add(project: Project) {
    this.projects.push(project);
  }
}
