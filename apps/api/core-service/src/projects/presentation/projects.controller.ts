import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { withSafeListener } from 'shared';
import { ListProjectMapsUseCase } from '../application/use-cases/list-project-maps.use-case.js';
import { ListProjectsUseCase } from '../application/use-cases/list-projects.use-case.js';
import {
  ProjectMapsResponseDto,
  toProjectMapsResponse,
} from './dto/project-maps-response.dto.js';

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
  @ApiOkResponse({ type: ProjectMapsResponseDto, description: 'The maps of the project' })
  @ApiNotFoundResponse({
    description:
      'project_not_found: No such project. This is a 404 because the project is in the URL',
  })
  findMaps(@Param('id') id: string) {
    return withSafeListener('GET /projects/:id/maps', async () =>
      toProjectMapsResponse(id, await this.listProjectMaps.execute(id)),
    );
  }
}
