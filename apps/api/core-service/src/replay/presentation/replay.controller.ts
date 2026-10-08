import { Controller, Get } from '@nestjs/common';
import { ReadOrderEventsUseCase } from '../application/use-cases/read-order-events.use-case';

@Controller('replay')
export class ReplayController {
  constructor(private readonly readOrderEvents: ReadOrderEventsUseCase) {}

  @Get('order-events')
  orderEvents() {
    return this.readOrderEvents.execute();
  }
}
