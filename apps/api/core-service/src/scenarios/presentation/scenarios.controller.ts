import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { withSafeListener } from 'shared';
import { parseSort } from '../../common/dto/sort.dto.js';
import {
  SCENARIO_SORT_FIELDS,
  type ScenarioSortField,
} from '../application/ports/scenario.repository.js';
import { CloneScenarioUseCase } from '../application/use-cases/clone-scenario.use-case.js';
import { CreateScenarioUseCase } from '../application/use-cases/create-scenario.use-case.js';
import { DeleteScenarioUseCase } from '../application/use-cases/delete-scenario.use-case.js';
import { GetScenarioUseCase } from '../application/use-cases/get-scenario.use-case.js';
import { ListScenariosUseCase } from '../application/use-cases/list-scenarios.use-case.js';
import { UpdateScenarioUseCase } from '../application/use-cases/update-scenario.use-case.js';
import { DraftScenarioGuard } from './guards/draft-scenario.guard.js';
import { CloneScenarioDto } from './dto/clone-scenario.dto.js';
import { CreateScenarioDto } from './dto/create-scenario.dto.js';
import { ListAllScenariosQuery } from './dto/list-all-scenarios.query.js';
import { UpdateScenarioDto } from './dto/update-scenario.dto.js';

@Controller('scenarios')
export class ScenariosController {
  constructor(
    private readonly listScenarios: ListScenariosUseCase,
    private readonly getScenario: GetScenarioUseCase,
    private readonly createScenario: CreateScenarioUseCase,
    private readonly updateScenario: UpdateScenarioUseCase,
    private readonly cloneScenario: CloneScenarioUseCase,
    private readonly deleteScenario: DeleteScenarioUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List scenarios' })
  list(@Query() q: ListAllScenariosQuery) {
    return withSafeListener('GET /scenarios', () =>
      this.listScenarios.execute({
        status: q.status,
        mapId: q.map_id,
        projectId: q.project_id,
        sort: parseSort<ScenarioSortField>(q.sort, SCENARIO_SORT_FIELDS, {
          field: 'updated_at',
          direction: 'desc',
        }),
        limit: q.limit ?? 20,
        cursor: q.cursor,
      }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a scenario by ID' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Scenario ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return withSafeListener(`GET /scenarios/${id}`, () => this.getScenario.execute(id));
  }

  @Post()
  @ApiOperation({ summary: 'Create a scenario' })
  create(@Body() dto: CreateScenarioDto) {
    return withSafeListener('POST /scenarios', () => this.createScenario.execute(dto));
  }

  @Put(':id')
  @UseGuards(DraftScenarioGuard)
  @ApiOperation({ summary: 'Update a scenario' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Scenario ID' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateScenarioDto) {
    return withSafeListener(`PUT /scenarios/${id}`, () =>
      this.updateScenario.execute({ id, ...dto }),
    );
  }

  @Post('clone')
  @ApiOperation({ summary: 'Clone a scenario into a new draft' })
  clone(@Body() dto: CloneScenarioDto) {
    return withSafeListener('POST /scenarios/clone', async () => {
      const created = await this.cloneScenario.execute(dto.id, dto.name);
      return {
        scenario_id: created.id,
        name: created.name,
        status: created.status,
        cloned_from_scenario_id: created.clonedFromScenarioId,
        created_by: created.authorId,
        created_at: created.createdAt,
      };
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Scenario deleted' })
  @ApiOperation({ summary: 'Delete a scenario' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Scenario ID' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return withSafeListener(`DELETE /scenarios/${id}`, () => this.deleteScenario.execute(id));
  }
}
