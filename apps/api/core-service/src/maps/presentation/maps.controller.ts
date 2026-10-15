import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam } from '@nestjs/swagger';
import { withSafeListener } from 'shared';
import { parseSort } from '../../common/dto/sort.dto';
import {
  SCENARIO_SORT_FIELDS,
  type ScenarioSortField,
} from '../../scenarios/application/ports/scenario.repository';
import { ListMapScenariosUseCase } from '../application/use-cases/list-map-scenarios.use-case';
import { ListScenariosQuery } from './dto/list-scenarios.query';

@Controller('maps')
export class MapsController {
  constructor(private readonly listMapScenarios: ListMapScenariosUseCase) {}

  @Get(':id/scenarios')
  @ApiOperation({ summary: 'List scenarios for a map' })
  @ApiParam({ name: 'id', description: 'Map ID' })
  listScenarios(@Param('id') mapId: string, @Query() query: ListScenariosQuery) {
    return withSafeListener(`GET /maps/${mapId}/scenarios`, () =>
      this.listMapScenarios.execute({
        mapId,
        status: query.status,
        sort: parseSort<ScenarioSortField>(query.sort, SCENARIO_SORT_FIELDS, {
          field: 'updated_at',
          direction: 'desc',
        }),
      }),
    );
  }
}
