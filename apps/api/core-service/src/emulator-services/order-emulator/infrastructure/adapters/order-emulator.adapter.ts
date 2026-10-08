import { Injectable } from '@nestjs/common';
import { OrderEmulatorPort } from '../../application/ports/order-emulator.port';

@Injectable()
export class OrderEmulatorAdapter implements OrderEmulatorPort {
  status() {
    return { name: 'order-emulator', ready: true };
  }
}
