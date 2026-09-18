import { Module } from '@nestjs/common';
import { AgentEmulatorController } from './agent-emulator.controller';
import { AgentEmulatorService } from './agent-emulator.service';

@Module({
  controllers: [AgentEmulatorController],
  providers: [AgentEmulatorService],
})
export class AgentEmulatorModule {}
