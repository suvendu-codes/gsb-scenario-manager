import { Run } from '../../domain/entities/run.entity';

export interface RunRepositoryPort {
  create(scenarioId: string): Run;
}

export const RUN_REPOSITORY = Symbol('RUN_REPOSITORY');
