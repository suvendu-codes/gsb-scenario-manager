import { Controller, Get } from '@nestjs/common';
import { GetOrderEmulatorStatusUseCase } from '../application/use-cases/get-order-emulator-status.use-case';

@Controller('emulators/order')
export class OrderEmulatorController {
  constructor(private readonly getStatus: GetOrderEmulatorStatusUseCase) {}

  @Get('status')
  status() {
    return this.getStatus.execute();
  }
}
