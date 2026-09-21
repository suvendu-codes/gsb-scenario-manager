import { Controller, Get } from '@nestjs/common';
import { OperatorEmulatorService } from './operator-emulator.service';

@Controller('emulators/operator')
export class OperatorEmulatorController {
  constructor(
    private readonly operatorEmulatorService: OperatorEmulatorService,
  ) {}

  @Get('status')
  status() {
    return this.operatorEmulatorService.status();
  }
}
