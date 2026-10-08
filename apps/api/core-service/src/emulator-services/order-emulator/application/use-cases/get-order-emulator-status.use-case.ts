import { Inject, Injectable } from '@nestjs/common';
import {
  ORDER_EMULATOR,
  type OrderEmulatorPort,
} from '../ports/order-emulator.port';

@Injectable()
export class GetOrderEmulatorStatusUseCase {
  constructor(
    @Inject(ORDER_EMULATOR)
    private readonly emulator: OrderEmulatorPort,
  ) {}

  execute() {
    return this.emulator.status();
  }
}
