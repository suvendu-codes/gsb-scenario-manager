import { Controller, Get } from '@nestjs/common';
import { ReplayService } from './replay.service';

@Controller('replay')
export class ReplayController {
  constructor(private readonly replayService: ReplayService) {}

  @Get('order-events')
  readOrderEvents() {
    return this.replayService.readOrderEvents();
  }
}
