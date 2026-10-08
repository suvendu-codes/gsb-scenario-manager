import { Injectable } from '@nestjs/common';
import { OperatorEmulatorPort } from '../../application/ports/operator-emulator.port';

@Injectable()
export class OperatorEmulatorAdapter implements OperatorEmulatorPort {
  status() {
    return { name: 'operator-emulator', ready: true };
  }
}
