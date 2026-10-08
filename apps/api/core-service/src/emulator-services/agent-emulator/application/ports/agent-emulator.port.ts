export interface EmulatorStatus {
  name: string;
  ready: boolean;
}

export interface AgentEmulatorPort {
  status(): EmulatorStatus;
}

export const AGENT_EMULATOR = Symbol('AGENT_EMULATOR');
