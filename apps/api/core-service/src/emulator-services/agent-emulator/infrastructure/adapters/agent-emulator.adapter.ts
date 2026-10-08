import { Injectable } from '@nestjs/common';
import { AgentEmulatorPort } from '../../application/ports/agent-emulator.port';

@Injectable()
export class AgentEmulatorAdapter implements AgentEmulatorPort {
  status() {
    return { name: 'agent-emulator', ready: true };
  }
}
