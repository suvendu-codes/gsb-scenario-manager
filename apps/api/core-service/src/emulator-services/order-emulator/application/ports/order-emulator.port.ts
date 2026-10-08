export interface EmulatorStatus {
  name: string;
  ready: boolean;
}

export interface OrderEmulatorPort {
  status(): EmulatorStatus;
}

export const ORDER_EMULATOR = Symbol('ORDER_EMULATOR');
