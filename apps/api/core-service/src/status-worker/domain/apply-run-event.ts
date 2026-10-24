import type { RunState } from '../../runs/domain/run-state.js';
import type { RunEvent } from './run-event.js';

type StoredRun = RunState;
export type RunEventChanges = Partial<Pick<StoredRun,
  'engineRunId' | 'status' | 'verdict' | 'reason' | 'results' | 'engineRef' |
  'statusMessage' | 'statusEventAt' | 'resultEventAt' | 'completedAt' | 'updatedAt'
>>;

export class RunIdentityMismatchError extends Error {
  constructor() { super('Run event identity does not match the stored run'); }
}

const terminal = new Set<StoredRun['status']>(['completed', 'failed', 'interrupted', 'cancelled']);
const stage: Record<StoredRun['status'], number> = {
  accepted: 0, queued: 1, provisioning: 2, setup_ready: 3, running: 4, paused: 4,
  completed: 5, failed: 5, interrupted: 5, cancelled: 5,
};

/** Called while holding the run row lock. Status and results have independent clocks. */
export function applyRunEvent(current: StoredRun, event: RunEvent, now: Date): RunEventChanges | null {
  if (current.correlationId !== event.correlation_id || current.engine !== event.engine ||
      (current.engineRunId !== null && current.engineRunId !== event.run_id)) {
    throw new RunIdentityMismatchError();
  }
  const emittedAt = new Date(event.emitted_at);
  const changes: RunEventChanges = { engineRunId: event.run_id, updatedAt: now };

  if (event.event_type === 'run.result') {
    if (current.resultEventAt && emittedAt <= current.resultEventAt) return null;
    return {
      ...changes,
      results: event.results,
      verdict: event.status,
      resultEventAt: emittedAt,
      // Preserve an explicit failed/cancelled/interrupted lifecycle outcome.
      status: terminal.has(current.status) ? current.status : 'completed',
      completedAt: current.completedAt ?? emittedAt,
    };
  }

  if (current.statusEventAt && emittedAt <= current.statusEventAt) return null;
  // An execution never changes its terminal outcome. A retry is a new run.
  // Results may still enrich the historical record through the branch above.
  if (terminal.has(current.status)) return null;
  if (stage[event.status] < stage[current.status]) return null;
  return {
    ...changes,
    status: event.status,
    statusEventAt: emittedAt,
    ...(event.reason !== undefined ? { reason: event.reason } : {}),
    ...(event.message !== undefined ? { statusMessage: event.message } : {}),
    ...(event.engine_ref ? { engineRef: JSON.stringify(event.engine_ref) } : {}),
    ...(terminal.has(event.status) ? { completedAt: emittedAt } : {}),
  };
}
