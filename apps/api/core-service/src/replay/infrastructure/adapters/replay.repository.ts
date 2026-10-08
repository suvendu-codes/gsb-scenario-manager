import { Injectable } from '@nestjs/common';
import { ReplayRepositoryPort } from '../../application/ports/replay.repository.port';
import { ReplayEnvelope } from '../../domain/entities/replay-envelope.entity';

@Injectable()
export class ReplayRepository implements ReplayRepositoryPort {
  readOrderEvents(): ReplayEnvelope[] {
    return [];
  }
}
