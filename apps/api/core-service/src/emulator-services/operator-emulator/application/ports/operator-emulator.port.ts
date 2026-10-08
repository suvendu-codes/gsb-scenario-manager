export interface EmulatorStatus {
  name: string;
  ready: boolean;
}

export interface OperatorEmulatorPort {
  status(): EmulatorStatus;
}

export const OPERATOR_EMULATOR = Symbol('OPERATOR_EMULATOR');
