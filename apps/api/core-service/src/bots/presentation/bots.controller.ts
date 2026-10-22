import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { withSafeListener } from 'shared';
import { GetMapBotsUseCase } from '../application/use-cases/get-map-bots.use-case.js';

@Controller('projects/:projectId/maps/:mapId')
export class BotsController {
  constructor(private readonly getMapBots: GetMapBotsUseCase) {}

  @Get('sizer')
  @ApiOperation({ summary: 'Get the bot types and counts the sizer gives for a map' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'mapId', description: 'Map ID' })
  @ApiNotFoundResponse({
    description:
      'project_not_found: No such project. This is a 404 because the project is in the URL',
  })
  getBots(@Param('projectId') projectId: string, @Param('mapId') mapId: string) {
    return withSafeListener(`GET /projects/${projectId}/maps/${mapId}/sizer`, () =>
      this.getMapBots.execute({ projectId, mapId }),
    );
  }
}
