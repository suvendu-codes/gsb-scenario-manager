import type { NewRun, Run, RunStatus } from '../../domain/run';

export interface RunRepository {
  findByIdempotencyKey(key: string): Promise<Run | null>;
  /** @throws DuplicateIdempotencyKeyError when the key was used concurrently. */
  create(input: NewRun): Promise<Run>;
  update(runId: string, patch: { status?: RunStatus; engineRef?: string }): Promise<Run>;
}

export const RUN_REPOSITORY = Symbol('RUN_REPOSITORY');
