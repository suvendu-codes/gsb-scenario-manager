import { Module } from '@nestjs/common';
import { OPERATOR_EMULATOR } from './application/ports/operator-emulator.port';
import { GetOperatorEmulatorStatusUseCase } from './application/use-cases/get-operator-emulator-status.use-case';
import { OperatorEmulatorAdapter } from './infrastructure/adapters/operator-emulator.adapter';
import { OperatorEmulatorController } from './presentation/operator-emulator.controller';

@Module({
  controllers: [OperatorEmulatorController],
  providers: [
    GetOperatorEmulatorStatusUseCase,
    {
      provide: OPERATOR_EMULATOR,
      useClass: OperatorEmulatorAdapter,
    },
  ],
})
export class OperatorEmulatorModule {}
