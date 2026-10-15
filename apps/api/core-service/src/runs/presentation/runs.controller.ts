import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { withSafeListener } from 'shared';
import { TriggerRunUseCase } from '../application/use-cases/trigger-run.use-case';
import { CreateRunDto } from './dto/create-run.dto';

@Controller('runs')
export class RunsController {
  constructor(private readonly triggerRun: TriggerRunUseCase) {}

  @Post()
  @ApiOperation({ summary: 'Trigger a run for a scenario' })
  trigger(@Body() dto: CreateRunDto) {
    return withSafeListener('POST /runs', () => this.triggerRun.execute(dto));
  }
}
