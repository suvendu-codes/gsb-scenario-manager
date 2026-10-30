import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { withSafeListener } from 'shared';
import { GetMapPpsUseCase } from '../application/use-cases/get-map-pps.use-case.js';
import { MapPpsParams } from './dto/map-pps.params.js';

@Controller('projects/:projectId/maps/:mapId/:mapVersion')
export class PpsController {
  constructor(private readonly getMapPps: GetMapPpsUseCase) {}

  @Get('pps')
  @ApiOperation({
    summary: 'Get the PPS stations of a map version with their default configuration',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'mapId', description: 'Map ID' })
  @ApiParam({
    name: 'mapVersion',
    type: Number,
    description: 'Map version (positive integer), e.g. 1',
  })
  @ApiBadRequestResponse({ description: 'mapVersion must be a positive integer' })
  @ApiNotFoundResponse({
    description:
      'project_not_found / map_not_found / map_version_not_found: No such project, map or map version',
  })
  getPps(@Param() { projectId, mapId, mapVersion }: MapPpsParams) {
    return withSafeListener(
      `GET /projects/${projectId}/maps/${mapId}/${mapVersion}/pps`,
      () => this.getMapPps.execute({ projectId, mapId, mapVersion }),
    );
  }
}
