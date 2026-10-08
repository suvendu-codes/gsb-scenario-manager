import { Module } from '@nestjs/common';
import { PROJECT_REPOSITORY } from './application/ports/project.repository.port';
import { ListProjectsUseCase } from './application/use-cases/list-projects.use-case';
import { InMemoryProjectRepository } from './infrastructure/adapters/in-memory-project.repository';
import { ProjectsController } from './presentation/projects.controller';

@Module({
  controllers: [ProjectsController],
  providers: [
    ListProjectsUseCase,
    {
      provide: PROJECT_REPOSITORY,
      useClass: InMemoryProjectRepository,
    },
  ],
})
export class ProjectsModule {}
