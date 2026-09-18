import { Module } from '@nestjs/common';
import { OrderEmulatorController } from './order-emulator.controller';
import { OrderEmulatorService } from './order-emulator.service';

@Module({
  controllers: [OrderEmulatorController],
  providers: [OrderEmulatorService],
})
export class OrderEmulatorModule {}
