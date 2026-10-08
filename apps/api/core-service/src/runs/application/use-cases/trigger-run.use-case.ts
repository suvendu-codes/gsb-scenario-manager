import { Inject, Injectable } from '@nestjs/common';
import {
  RUN_REPOSITORY,
  type RunRepositoryPort,
} from '../ports/run.repository.port';

@Injectable()
export class TriggerRunUseCase {
  constructor(
    @Inject(RUN_REPOSITORY)
    private readonly runs: RunRepositoryPort,
  ) {}

  execute(scenarioId: string) {
    return this.runs.create(scenarioId);
  }
}
