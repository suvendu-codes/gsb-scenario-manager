import { Controller, Get } from '@nestjs/common';
import { AgentEmulatorService } from './agent-emulator.service';

@Controller('emulators/agent')
export class AgentEmulatorController {
  constructor(private readonly agentEmulatorService: AgentEmulatorService) {}

  @Get('status')
  status() {
    return this.agentEmulatorService.status();
  }
}
