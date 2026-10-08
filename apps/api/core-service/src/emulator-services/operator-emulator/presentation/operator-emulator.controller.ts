import { Controller, Get } from '@nestjs/common';
import { GetOperatorEmulatorStatusUseCase } from '../application/use-cases/get-operator-emulator-status.use-case';

@Controller('emulators/operator')
export class OperatorEmulatorController {
  constructor(private readonly getStatus: GetOperatorEmulatorStatusUseCase) {}

  @Get('status')
  status() {
    return this.getStatus.execute();
  }
}
