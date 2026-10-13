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
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { withSafeListener } from 'shared';
import { CreateScenarioUseCase } from '../application/use-cases/create-scenario.use-case';
import { DeleteScenarioUseCase } from '../application/use-cases/delete-scenario.use-case';
import { DuplicateScenarioUseCase } from '../application/use-cases/duplicate-scenario.use-case';
import { GetScenarioUseCase } from '../application/use-cases/get-scenario.use-case';
import { UpdateScenarioUseCase } from '../application/use-cases/update-scenario.use-case';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { DuplicateScenarioDto } from './dto/duplicate-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';

@Controller('scenarios')
export class ScenariosController {
  constructor(
    private readonly getScenario: GetScenarioUseCase,
    private readonly createScenario: CreateScenarioUseCase,
    private readonly updateScenario: UpdateScenarioUseCase,
    private readonly duplicateScenario: DuplicateScenarioUseCase,
    private readonly deleteScenario: DeleteScenarioUseCase,
  ) {}

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
  @ApiOperation({ summary: 'Update a scenario' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Scenario ID' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateScenarioDto) {
    return withSafeListener(`PUT /scenarios/${id}`, () =>
      this.updateScenario.execute({ id, ...dto }),
    );
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a scenario' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Scenario ID' })
  duplicate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DuplicateScenarioDto) {
    return withSafeListener(`POST /scenarios/${id}/duplicate`, () =>
      this.duplicateScenario.execute(id, dto.createdBy),
    );
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
