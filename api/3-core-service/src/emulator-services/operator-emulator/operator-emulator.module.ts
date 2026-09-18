import { Module } from '@nestjs/common';
import { OperatorEmulatorController } from './operator-emulator.controller';
import { OperatorEmulatorService } from './operator-emulator.service';

@Module({
  controllers: [OperatorEmulatorController],
  providers: [OperatorEmulatorService],
})
export class OperatorEmulatorModule {}
