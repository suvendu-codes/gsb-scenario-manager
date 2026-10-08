import { Project } from '../../domain/entities/project.entity';

export interface ProjectRepositoryPort {
  findAll(): Project[];
}

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');
