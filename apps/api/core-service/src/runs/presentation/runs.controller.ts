import { Body, Controller, Post } from '@nestjs/common';
import { TriggerRunUseCase } from '../application/use-cases/trigger-run.use-case';
import { CreateRunDto } from './dto/create-run.dto';

@Controller('runs')
export class RunsController {
  constructor(private readonly triggerRun: TriggerRunUseCase) {}

  @Post()
  trigger(@Body() dto: CreateRunDto) {
    return this.triggerRun.execute(dto.scenarioId);
  }
}
