import { Injectable } from '@nestjs/common';
import { RunRepositoryPort } from '../../application/ports/run.repository.port';
import { Run } from '../../domain/entities/run.entity';

@Injectable()
export class InMemoryRunRepository implements RunRepositoryPort {
  create(scenarioId: string): Run {
    return {
      runId: crypto.randomUUID(),
      scenarioId,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };
  }
}
