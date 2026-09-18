import { Injectable } from '@nestjs/common';

@Injectable()
export class OrderEmulatorService {
  status() {
    return { name: 'order-emulator', ready: true };
  }
}
