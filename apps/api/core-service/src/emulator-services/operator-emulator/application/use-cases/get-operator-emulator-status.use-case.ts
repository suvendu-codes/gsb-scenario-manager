import { Inject, Injectable } from '@nestjs/common';
import {
  OPERATOR_EMULATOR,
  type OperatorEmulatorPort,
} from '../ports/operator-emulator.port';

@Injectable()
export class GetOperatorEmulatorStatusUseCase {
  constructor(
    @Inject(OPERATOR_EMULATOR)
    private readonly emulator: OperatorEmulatorPort,
  ) {}

  execute() {
    return this.emulator.status();
  }
}
