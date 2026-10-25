import { isDeepStrictEqual } from 'node:util';
import type { RunState } from '../../runs/domain/run-state.js';
import { applyRunEvent, RunEventContractError, validateRunIdentity, type RunEventChanges } from './apply-run-event.js';
import type { OrderedRunEvent, RunEvent } from './run-event.js';

/** Shared transaction plan for production and test storage; no I/O or logging. */
export function planRunEvents(current: RunState, event: RunEvent, receipts: OrderedRunEvent[], now: Date) {
  validateRunIdentity(current, event);
  if (event.event_type === 'run.heartbeat') {
    const changes = applyRunEvent(current, event, now);
    return { changes, receipt: null, outcome: changes ? 'updated' as const : 'ignored' as const };
  }
  const duplicate = receipts.find(e => e.sequence === event.sequence);
  // JSON property ordering is irrelevant; a changed payload under one sequence is
  // not a safe replay. Persisted receipts allow checking even historical duplicates.
  if (duplicate && !isDeepStrictEqual(duplicate, event)) throw new RunEventContractError();
  if (!duplicate && event.sequence <= current.lastEventSequence) {
    // An applied sequence must have a retained receipt. Missing receipt history
    // is an integrity problem, not a verified duplicate.
    throw new RunEventContractError();
  }
  if (duplicate && event.sequence <= current.lastEventSequence) {
    return { changes: null, receipt: null, outcome: 'ignored' as const };
  }
  const queued = [...receipts.filter(e => e.sequence > current.lastEventSequence), ...(!duplicate ? [event] : [])]
    .sort((a, b) => a.sequence - b.sequence);
  let updated = { ...current };
  const changes: RunEventChanges = {};
  // Only apply the contiguous prefix. Missing ranges stay in durable storage so
  // Kafka can advance for unrelated runs without losing this run's future events.
  for (const next of queued) {
    if (next.sequence !== updated.lastEventSequence + 1) break;
    const applied = applyRunEvent(updated, next, now);
    Object.assign(changes, applied);
    updated = { ...updated, ...applied };
  }
  const recoveryRequired = queued.some(e => e.sequence > updated.lastEventSequence);
  return {
    changes: { ...changes, recoveryRequired },
    receipt: duplicate ? null : event,
    outcome: recoveryRequired ? 'held' as const : 'updated' as const,
  };
}
