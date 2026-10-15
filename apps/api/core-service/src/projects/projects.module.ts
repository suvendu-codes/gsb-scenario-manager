import { Module } from '@nestjs/common';
import { MapsModule } from '../maps/maps.module';
import { PROJECT_REPOSITORY } from './application/ports/project.repository';
import { ListProjectMapsUseCase } from './application/use-cases/list-project-maps.use-case';
import { ListProjectsUseCase } from './application/use-cases/list-projects.use-case';
import { InMemoryProjectRepository } from './infrastructure/in-memory-project.repository';
import { ProjectsController } from './presentation/projects.controller';

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
