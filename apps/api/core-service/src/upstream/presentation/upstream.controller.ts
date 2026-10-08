import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { GetAgentOperationsUseCase } from '../application/use-cases/get-agent-operations.use-case';
import { GetUpstreamMapsUseCase } from '../application/use-cases/get-upstream-maps.use-case';
import { GetUpstreamProjectsUseCase } from '../application/use-cases/get-upstream-projects.use-case';
import { GetUpstreamSolutionsUseCase } from '../application/use-cases/get-upstream-solutions.use-case';

// Dummy stand-ins for Foundry GraphQL (projects/solutions/agentOperations) and GSB-BFF (maps).
@Controller('upstream')
export class UpstreamController {
  constructor(
    private readonly getProjects: GetUpstreamProjectsUseCase,
    private readonly getSolutions: GetUpstreamSolutionsUseCase,
    private readonly getAgentOperations: GetAgentOperationsUseCase,
    private readonly getMaps: GetUpstreamMapsUseCase,
  ) {}

  @Get('projects')
  projects() {
    return this.getProjects.execute();
  }

  @Get('projects/:projectId/solutions')
  solutions(@Param('projectId') projectId: string) {
    return this.getSolutions.execute(projectId);
  }

  @Get('agent-operations')
  agentOperations(@Query('gsbFunctionalAreaId') areaId?: string) {
    return this.getAgentOperations.execute(
      areaId === undefined ? undefined : Number(areaId),
    );
  }

  @Get(
    'solutions/:siteId/functional-areas/:functionalAreaId/agents/:agentId/maps',
  )
  maps(
    @Param('siteId', ParseIntPipe) _siteId: number,
    @Param('functionalAreaId', ParseIntPipe) _functionalAreaId: number,
    @Param('agentId', ParseIntPipe) _agentId: number,
    @Query('page') page = '1',
    @Query('page_size') pageSize = '50',
  ) {
    return this.getMaps.execute(Number(page) || 1, Number(pageSize) || 50);
  }
}
