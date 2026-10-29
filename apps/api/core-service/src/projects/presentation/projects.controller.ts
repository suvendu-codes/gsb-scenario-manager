import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { withSafeListener } from 'shared';
import { ListProjectsUseCase } from '../application/use-cases/list-projects.use-case.js';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly listProjects: ListProjectsUseCase) {}

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  findAll() {
    return withSafeListener('GET /projects', () => this.listProjects.execute());
  }
}
