import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { withSafeListener } from 'shared';
import { UserEmail } from '../../common/decorator/user-email.decorator.js';
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
import { flattenOverrides } from './dto/flatten-overrides.js';
import { ListAllScenariosQuery } from './dto/list-all-scenarios.query.js';
import {
  CreateScenarioResponseDto,
  ListScenariosResponseDto,
  PatchScenarioResponseDto,
  ScenarioDetailDto,
  ScenarioDto,
  toCreateScenarioResponse,
  toListScenariosResponse,
  toPatchScenarioResponse,
  toScenario,
  toScenarioDetail,
} from './dto/scenario-response.dto.js';
import { PatchScenarioDto } from './dto/update-scenario.dto.js';

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
  @ApiBadRequestResponse({ description: 'Invalid query parameter or sort field' })
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
          page: q.page,
          limit: q.limit,
        }),
      ),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a scenario by ID' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Scenario ID' })
  @ApiOkResponse({ type: ScenarioDetailDto })
  @ApiNotFoundResponse({ description: 'scenario_not_found: No scenario with this id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return withSafeListener(`GET /scenarios/${id}`, async () => {
      const { scenario, configUri, config } = await this.getScenario.execute(id);
      return toScenarioDetail(scenario, configUri, flattenOverrides(config) as Record<string, unknown>);
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a scenario' })
  @ApiCreatedResponse({ type: CreateScenarioResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'scenario_already_exists: The name is already used for this project and map' })
  @ApiHeader({ name: 'x-user-email', required: false, description: 'Creator; recorded as created_by' })
  create(@Body() dto: CreateScenarioDto, @UserEmail() author: string) {
    return withSafeListener('POST /scenarios', async () => {
      const { scenario } = await this.createScenario.execute({
        projectId: dto.project_id,
        mapId: dto.map_id,
        name: dto.name,
        config: dto.config,
        authorId: author,
        createdBy: author,
      });
      return toCreateScenarioResponse(scenario);
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a scenario: rename, repoint the config blob, or merge config overrides' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Scenario ID' })
  @ApiOkResponse({ type: PatchScenarioResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'scenario_not_found: No scenario with this id' })
  @ApiConflictResponse({
    description: 'scenario_not_editable: The status is not draft. scenario_already_exists: The name is taken',
  })
  @ApiHeader({ name: 'x-user-email', required: false, description: 'Editor; recorded as updated_by' })
  patch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchScenarioDto,
    @UserEmail() updatedBy: string,
  ) {
    return withSafeListener(`PATCH /scenarios/${id}`, async () => {
      const { scenario, changes, modules } = await this.updateScenario.execute({
        id,
        name: dto.name,
        configUri: dto.configUri,
        config: dto.config,
        updatedBy,
      });
      return toPatchScenarioResponse(scenario, updatedBy, changes, modules);
    });
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone a scenario into a new draft owned by the caller' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID of the scenario to clone' })
  @ApiCreatedResponse({ type: ScenarioDto })
  @ApiNotFoundResponse({ description: 'scenario_not_found: No scenario with this id' })
  @ApiConflictResponse({ description: 'scenario_already_exists: The name is already used for this project and map' })
  @ApiHeader({ name: 'x-user-email', required: false, description: 'Cloner; becomes the new scenario author' })
  clone(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CloneScenarioDto, @UserEmail() actor: string) {
    return withSafeListener(`POST /scenarios/${id}/clone`, async () => {
      const { scenario, configUri } = await this.cloneScenario.execute(id, actor, dto.name);
      return toScenario(scenario, configUri);
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Scenario deleted' })
  @ApiNotFoundResponse({ description: 'scenario_not_found: No scenario with this id' })
  @ApiConflictResponse({ description: 'The scenario cannot be deleted in its current status' })
  @ApiOperation({ summary: 'Delete a scenario' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Scenario ID' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return withSafeListener(`DELETE /scenarios/${id}`, () => this.deleteScenario.execute(id));
  }
}
