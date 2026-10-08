import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CreateScenarioUseCase } from '../application/use-cases/create-scenario.use-case';
import { DeleteScenarioUseCase } from '../application/use-cases/delete-scenario.use-case';
import { DuplicateScenarioUseCase } from '../application/use-cases/duplicate-scenario.use-case';
import { GetScenarioConfigUseCase } from '../application/use-cases/get-scenario-config.use-case';
import { ListScenariosUseCase } from '../application/use-cases/list-scenarios.use-case';
import { UpdateScenarioUseCase } from '../application/use-cases/update-scenario.use-case';
import {
  CreateScenarioDto,
  ListScenariosQuery,
  UpdateScenarioDto,
} from './dto/scenario.dto';

@Controller()
export class ScenariosController {
  constructor(
    private readonly listScenarios: ListScenariosUseCase,
    private readonly getScenarioConfig: GetScenarioConfigUseCase,
    private readonly createScenario: CreateScenarioUseCase,
    private readonly updateScenario: UpdateScenarioUseCase,
    private readonly duplicateScenario: DuplicateScenarioUseCase,
    private readonly deleteScenario: DeleteScenarioUseCase,
  ) {}

  @Get('maps/:mapId/scenarios')
  findByMap(@Param('mapId') mapId: string, @Query() query: ListScenariosQuery) {
    return this.listScenarios.execute(mapId, query.status, query.sort);
  }

  @Get('scenarios/:id')
  getConfig(@Param('id') id: string) {
    return this.getScenarioConfig.execute(id);
  }

  @Post('scenarios')
  create(@Body() dto: CreateScenarioDto) {
    return this.createScenario.execute(dto.mapId, dto.name);
  }

  @Put('scenarios/:id')
  update(@Param('id') id: string, @Body() dto: UpdateScenarioDto) {
    return this.updateScenario.execute(id, dto);
  }

  @Post('scenarios/:id/duplicate')
  duplicate(@Param('id') id: string) {
    return this.duplicateScenario.execute(id);
  }

  @Delete('scenarios/:id')
  remove(@Param('id') id: string) {
    return this.deleteScenario.execute(id);
  }
}
