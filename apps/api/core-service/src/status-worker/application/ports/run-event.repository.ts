import type { RunEvent } from '../../domain/run-event.js';

export const RUN_EVENT_REPOSITORY = Symbol('RUN_EVENT_REPOSITORY');

export interface RunEventRepository {
  /** Atomically load by correlation ID, apply shared applyRunEvent rules, and persist.
   * Resolve only after durable commit (or a confirmed no-op); propagate failures.
   * Persist scenario status in the same transaction only if currentRunId matches.
   * Lock scenario before run; trigger/retry writers must use the same order.
   * Never infer current ownership from timestamps or overwrite another execution.
   */
  apply(event: RunEvent): Promise<'updated' | 'ignored'>;
}

export class RunNotFoundError extends Error {
  constructor() { super('No run exists for this correlation ID'); }
}
