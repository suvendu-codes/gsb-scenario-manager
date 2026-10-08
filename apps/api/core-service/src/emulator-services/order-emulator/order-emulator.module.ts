import { Module } from '@nestjs/common';
import { ORDER_EMULATOR } from './application/ports/order-emulator.port';
import { GetOrderEmulatorStatusUseCase } from './application/use-cases/get-order-emulator-status.use-case';
import { OrderEmulatorAdapter } from './infrastructure/adapters/order-emulator.adapter';
import { OrderEmulatorController } from './presentation/order-emulator.controller';

@Module({
  controllers: [OrderEmulatorController],
  providers: [
    GetOrderEmulatorStatusUseCase,
    {
      provide: ORDER_EMULATOR,
      useClass: OrderEmulatorAdapter,
    },
  ],
})
export class OrderEmulatorModule {}
