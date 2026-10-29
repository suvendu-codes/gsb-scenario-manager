import { Project } from '../../domain/project.js';

export interface ProjectRepository {
  findAll(): Promise<Project[]>;
}

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');
