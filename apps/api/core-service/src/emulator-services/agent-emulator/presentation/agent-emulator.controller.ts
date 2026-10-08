import { Controller, Get } from '@nestjs/common';
import { GetAgentEmulatorStatusUseCase } from '../application/use-cases/get-agent-emulator-status.use-case';

@Controller('emulators/agent')
export class AgentEmulatorController {
  constructor(private readonly getStatus: GetAgentEmulatorStatusUseCase) {}

  @Get('status')
  status() {
    return this.getStatus.execute();
  }
}
