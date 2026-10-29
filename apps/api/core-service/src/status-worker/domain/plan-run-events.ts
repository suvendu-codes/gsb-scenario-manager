import { isDeepStrictEqual } from 'node:util';
import type { RunState } from '../../runs/domain/run-state.js';
import { applyRunEvent, RunEventContractError, validateRunIdentity, type RunEventChanges } from './apply-run-event.js';
import type { OrderedRunEvent, RunEvent } from './run-event.js';

/**
 * Shared transaction plan for production and test storage; no I/O or logging.
 *
 * Pure function: given the run's CURRENT state, the NEW event and the receipts already stored, it
 * returns what the caller must save. It never touches the database, so it is easy to unit test
 * (plan-run-events.spec.ts) and is reused by the PostgreSQL and the in-memory repositories.
 *
 * Why "sequence"? Status and result events of one run carry a counter: 1, 2, 3, ... Kafka can
 * deliver duplicates, and messages can arrive out of order, so we apply an event only when it is
 * exactly lastEventSequence + 1. Everything else is classified like this:
 *
 *   Situation (example: run has applied up to sequence 5)           Result
 *   --------------------------------------------------------------  --------------------------------------
 *   Heartbeat (no sequence)                                         applied separately; never touches status
 *   Sequence 5 again, identical to the stored receipt               'ignored' (harmless duplicate)
 *   Sequence 5 again, but with a DIFFERENT payload                  throws (not a safe replay)
 *   Sequence 4 but no receipt stored for it                         throws (our own history is damaged)
 *   Sequence 6 (next in line)                                       applied -> 'updated'
 *   Sequence 8 (6 and 7 missing: a GAP)                             stored only -> 'held', recovery_required=true
 *   Sequence 6 arrives later and 7, 8 were already stored           6, 7, 8 all applied in one go -> 'updated'
 *   A STORED future event breaks the rules once replayed            valid events before it still commit;
 *     (e.g. held 7 is a non-terminal status but 6 ended the run)    that receipt stays stored, run stays
 *                                                                   'held' + recovery_required (see below)
 *   The INCOMING event itself breaks the rules                      throws => rollback => Kafka redelivers
 *
 * A "receipt" is a copy of each accepted sequenced event, kept in table run_event_inbox. It is how we
 * recognise duplicates and how events waiting behind a gap survive until the gap closes.
 */
export function planRunEvents(current: RunState, event: RunEvent, receipts: OrderedRunEvent[], now: Date) {
  // The event must belong to THIS run (same correlation id, same engine, same engine run id).
  validateRunIdentity(current, event);
  // Heartbeats ("I am alive" + optional progress) are observations only. They have no sequence,
  // no receipt, and applyRunEvent never lets them change status, results or commands.
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
  // "queued" = every event still waiting to be applied, in sequence order: the stored receipts beyond
  // lastEventSequence (parked earlier behind a gap) plus the incoming event if it is new.
  const queued = [...receipts.filter(e => e.sequence > current.lastEventSequence), ...(!duplicate ? [event] : [])]
    .sort((a, b) => a.sequence - b.sequence);
  let updated = { ...current };
  const changes: RunEventChanges = {};
  // Sequence of a STORED receipt that is invalid once replayed; null when none.
  let blockedSequence: number | null = null;
  // Only apply the contiguous prefix. Missing ranges stay in durable storage so
  // Kafka can advance for unrelated runs without losing this run's future events.
  for (const next of queued) {
    if (next.sequence !== updated.lastEventSequence + 1) break;
    let applied: RunEventChanges | null;
    try {
      applied = applyRunEvent(updated, next, now);
    } catch (error) {
      // The incoming event is not durable yet: its failure keeps the documented
      // contract (reject, roll back, leave the record unacknowledged).
      // (A redelivered duplicate is already stored, so it counts as a stored receipt.)
      const isNewIncoming = !duplicate && next === event;
      if (isNewIncoming || !(error instanceof RunEventContractError)) throw error;
      // A stored receipt passed schema/identity checks on arrival, but business
      // rules only run on replay, against the state built from its predecessors.
      // If it now violates them, it must not roll back the valid events ahead of
      // it (including the incoming one). Stop here and commit the valid prefix.
      // recoveryRequired stays true below, so commands remain blocked and the
      // unresolved sequence stays visible for operator repair.
      // TODO: persist a rejected/quarantined marker on the receipt (SMF-503/504)
      // so operators can list blocked runs without replaying.
      blockedSequence = next.sequence;
      break;
    }
    Object.assign(changes, applied);
    updated = { ...updated, ...applied };
  }
  // Anything still queued after the loop is waiting behind a gap (or a blocked receipt). While that is
  // true recovery_required stays set, which tells the command API not to accept new commands for this run.
  const recoveryRequired = queued.some(e => e.sequence > updated.lastEventSequence);
  return {
    changes: { ...changes, recoveryRequired },
    receipt: duplicate ? null : event,
    outcome: recoveryRequired ? 'held' as const : 'updated' as const,
    blockedSequence,
  };
}
