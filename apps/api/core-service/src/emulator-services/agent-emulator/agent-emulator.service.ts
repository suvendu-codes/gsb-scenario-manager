import { Injectable } from '@nestjs/common';

@Injectable()
export class AgentEmulatorService {
  status() {
    return { name: 'agent-emulator', ready: true };
  }
}
