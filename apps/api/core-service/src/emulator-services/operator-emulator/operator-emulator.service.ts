import { Injectable } from '@nestjs/common';

@Injectable()
export class OperatorEmulatorService {
  status() {
    return { name: 'operator-emulator', ready: true };
  }
}
