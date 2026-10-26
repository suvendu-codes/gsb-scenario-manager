import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { withSafeListener } from 'shared';
import { GetMapPpsUseCase } from '../application/use-cases/get-map-pps.use-case.js';

@Controller('projects/:projectId/maps/:mapId')
export class PpsController {
  constructor(private readonly getMapPps: GetMapPpsUseCase) {}

  @Get('pps')
  @ApiOperation({ summary: 'Get the PPS stations of a map with their default configuration' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'mapId', description: 'Map ID' })
  @ApiNotFoundResponse({
    description: 'project_not_found / map_not_found: No such project or map',
  })
  getPps(@Param('projectId') projectId: string, @Param('mapId') mapId: string) {
    return withSafeListener(`GET /projects/${projectId}/maps/${mapId}/pps`, () =>
      this.getMapPps.execute({ projectId, mapId }),
    );
  }
}
