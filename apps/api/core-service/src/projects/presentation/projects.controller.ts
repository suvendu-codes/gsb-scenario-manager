import { Controller, Get } from '@nestjs/common';
import { ListProjectsUseCase } from '../application/use-cases/list-projects.use-case';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly listProjects: ListProjectsUseCase) {}

  @Get()
  findAll() {
    return this.listProjects.execute();
  }
}
