import { Controller, Get } from '@nestjs/common';
import { OrderEmulatorService } from './order-emulator.service';

@Controller('emulators/order')
export class OrderEmulatorController {
  constructor(private readonly orderEmulatorService: OrderEmulatorService) {}

  @Get('status')
  status() {
    return this.orderEmulatorService.status();
  }
}
