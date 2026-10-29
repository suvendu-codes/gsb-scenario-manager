import { Module } from '@nestjs/common';
import { PROJECT_REPOSITORY } from './application/ports/project.repository.js';
import { ListProjectsUseCase } from './application/use-cases/list-projects.use-case.js';
import { InMemoryProjectRepository } from './infrastructure/in-memory-project.repository.js';
import { ProjectsController } from './presentation/projects.controller.js';

@Module({
  controllers: [ProjectsController],
  providers: [
    ListProjectsUseCase,
    { provide: PROJECT_REPOSITORY, useClass: InMemoryProjectRepository },
  ],
})
export class ProjectsModule {}
