import { Inject, Injectable } from '@nestjs/common';
import {
  AGENT_EMULATOR,
  type AgentEmulatorPort,
} from '../ports/agent-emulator.port';

@Injectable()
export class GetAgentEmulatorStatusUseCase {
  constructor(
    @Inject(AGENT_EMULATOR)
    private readonly emulator: AgentEmulatorPort,
  ) {}

  execute() {
    return this.emulator.status();
  }
}
