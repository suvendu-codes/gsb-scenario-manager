import { Module } from '@nestjs/common';
import { MapsModule } from '../maps/maps.module.js';
import { PROJECT_REPOSITORY } from './application/ports/project.repository.js';
import { ListProjectMapsUseCase } from './application/use-cases/list-project-maps.use-case.js';
import { ListProjectsUseCase } from './application/use-cases/list-projects.use-case.js';
import { InMemoryProjectRepository } from './infrastructure/in-memory-project.repository.js';
import { ProjectsController } from './presentation/projects.controller.js';

@Module({
  imports: [MapsModule],
  controllers: [ProjectsController],
  providers: [
    ListProjectsUseCase,
    ListProjectMapsUseCase,
    { provide: PROJECT_REPOSITORY, useClass: InMemoryProjectRepository },
  ],
})
export class ProjectsModule {}
