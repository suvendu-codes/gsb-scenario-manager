import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam } from '@nestjs/swagger';
import { withSafeListener } from 'shared';
import { ListProjectMapsUseCase } from '../application/use-cases/list-project-maps.use-case';
import { ListProjectsUseCase } from '../application/use-cases/list-projects.use-case';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly listProjects: ListProjectsUseCase,
    private readonly listProjectMaps: ListProjectMapsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  findAll() {
    return withSafeListener('GET /projects', () => this.listProjects.execute());
  }

  @Get(':id/maps')
  @ApiOperation({ summary: 'List maps in a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  findMaps(@Param('id') id: string) {
    return withSafeListener('GET /projects/:id/maps', () =>
      this.listProjectMaps.execute(id),
    );
  }
}
