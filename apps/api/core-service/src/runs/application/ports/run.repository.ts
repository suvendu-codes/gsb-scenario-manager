import type { NewRun, Run, RunStatus } from '../../domain/run';

export interface RunRepository {
  findByCorrelationId(correlationId: string): Promise<Run | null>;
  /** @throws DuplicateCorrelationIdError when the id was used concurrently. */
  create(input: NewRun): Promise<Run>;
  update(
    runId: string,
    patch: { status?: RunStatus; engineRef?: string; engineRunId?: string; reason?: string },
  ): Promise<Run>;
}

export const RUN_REPOSITORY = Symbol('RUN_REPOSITORY');
