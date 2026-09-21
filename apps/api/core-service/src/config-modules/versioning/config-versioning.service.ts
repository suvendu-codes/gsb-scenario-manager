import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigVersioningService {
  nextVersion(current: number): number {
    return current + 1;
  }
}
