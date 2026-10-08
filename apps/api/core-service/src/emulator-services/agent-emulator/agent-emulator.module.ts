import { Module } from '@nestjs/common';
import { AGENT_EMULATOR } from './application/ports/agent-emulator.port';
import { GetAgentEmulatorStatusUseCase } from './application/use-cases/get-agent-emulator-status.use-case';
import { AgentEmulatorAdapter } from './infrastructure/adapters/agent-emulator.adapter';
import { AgentEmulatorController } from './presentation/agent-emulator.controller';

@Module({
  controllers: [AgentEmulatorController],
  providers: [
    GetAgentEmulatorStatusUseCase,
    {
      provide: AGENT_EMULATOR,
      useClass: AgentEmulatorAdapter,
    },
  ],
})
export class AgentEmulatorModule {}
