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
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
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
import { CloneScenarioDto } from './dto/clone-scenario.dto.js';
import { CreateScenarioDto } from './dto/create-scenario.dto.js';
import { ListAllScenariosQuery } from './dto/list-all-scenarios.query.js';
import {
  ListScenariosResponseDto,
  ScenarioDto,
  toListScenariosResponse,
  toScenario,
} from './dto/scenario-response.dto.js';
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
  @ApiOkResponse({ type: ListScenariosResponseDto })
  list(@Query() q: ListAllScenariosQuery) {
    return withSafeListener('GET /scenarios', async () =>
      toListScenariosResponse(
        await this.listScenarios.execute({
        status: q.status === 'all' ? undefined : q.status,
        mapId: q.map_id,
        projectId: q.project_id,
        sort: parseSort<ScenarioSortField>(q.sort, SCENARIO_SORT_FIELDS, {
          field: 'created_at',
          direction: 'desc',
        }),
        limit: q.limit ?? 20,
        cursor: q.cursor,
        }),
      ),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a scenario by ID' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Scenario ID' })
  @ApiOkResponse({ type: ScenarioDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return withSafeListener(`GET /scenarios/${id}`, async () => {
      const { scenario, configUri } = await this.getScenario.execute(id);
      return toScenario(scenario, configUri);
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a scenario' })
  @ApiCreatedResponse({ type: ScenarioDto })
  create(@Body() dto: CreateScenarioDto) {
    return withSafeListener('POST /scenarios', async () => {
      const { scenario, configUri } = await this.createScenario.execute(dto);
      return toScenario(scenario, configUri);
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a scenario' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Scenario ID' })
  @ApiOkResponse({ type: ScenarioDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateScenarioDto) {
    return withSafeListener(`PUT /scenarios/${id}`, async () => {
      const { scenario, configUri } = await this.updateScenario.execute({ id, ...dto });
      return toScenario(scenario, configUri);
    });
  }

  @Post('clone')
  @ApiOperation({ summary: 'Clone a scenario into a new draft' })
  @ApiCreatedResponse({ type: ScenarioDto })
  clone(@Body() dto: CloneScenarioDto) {
    return withSafeListener('POST /scenarios/clone', async () => {
      const { scenario, configUri } = await this.cloneScenario.execute(dto.id, dto.name);
      return toScenario(scenario, configUri);
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
