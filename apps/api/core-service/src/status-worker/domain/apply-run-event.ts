import type { RunState } from '../../runs/domain/run-state.js';
import type { RunEvent } from './run-event.js';
import { RunEventRejectedError } from './run-event-rejection.js';

export type RunEventChanges = Partial<RunState>;
export class RunIdentityMismatchError extends RunEventRejectedError {
  constructor(code: 'correlation_mismatch' | 'engine_mismatch' | 'engine_run_id_mismatch' = 'engine_run_id_mismatch') {
    super(code, 'Run event identity does not match the stored run');
  }
}
export class RunEventContractError extends RunEventRejectedError {
  constructor() { super('invalid_event_schema', 'Run event violates the execution contract'); }
}
/*
 * BUSINESS RULES for one event against one run. Pure functions: no database, no Kafka.
 *
 * Run lifecycle (status values the engine reports):
 *
 *   trigger_requested -> accepted -> setup_ready -> running <-> paused (-> resuming -> running)
 *                                                      |
 *                                     completed | failed | cancelled | interrupted   (TERMINAL)
 *
 * Terminal = finished for good. After it the status never changes again; the only event still
 * accepted is ONE `run.result` (the engine's opaque JSON outcome) for completed/failed/interrupted.
 *
 * Commands: the user can ask for run / pause / resume / cancel. That request is stored as
 * `pending_command` by the command API (not this worker). The engine answers with status events that
 * echo `command_id` + `command_sequence` and a `decision` (accepted / rejected). Accepted alone does
 * NOT finish the command; the matching destination status does (pause -> paused, resume -> running,
 * cancel -> cancelled). A rejection clears it without changing the confirmed status.
 */
export const terminal = new Set<RunState['status']>(['completed', 'failed', 'interrupted', 'cancelled']);
/** Guard: is this event really from the run we loaded? Each failure is a distinct rejection code. */
export function validateRunIdentity(current: RunState, event: RunEvent) {
  if (current.correlationId !== event.correlation_id) throw new RunIdentityMismatchError('correlation_mismatch');
  if (current.engine !== event.engine) throw new RunIdentityMismatchError('engine_mismatch');
  if (event.run_id !== undefined && current.engineRunId !== null && current.engineRunId !== event.run_id) {
    throw new RunIdentityMismatchError('engine_run_id_mismatch');
  }
}
// TODO: confirm engine phase support. This guards lifecycle regressions; it does
// not decide which user commands the engine is capable of executing.
// Allowed moves: key = current status, value = statuses the engine may report next.
// (Most statuses may also repeat themselves, e.g. running -> running: engines resend snapshots.)
// Terminal statuses are handled separately below, so they are not listed as targets here.
const transitions: Record<RunState['status'], readonly RunState['status'][]> = {
  trigger_requested: ['accepted'],
  accepted: ['accepted', 'setup_ready', 'paused', 'running'],
  queued: ['setup_ready', 'running', 'paused'], provisioning: ['setup_ready', 'running', 'paused'],
  setup_ready: ['setup_ready', 'running', 'paused'], running: ['running', 'paused'],
  paused: ['paused', 'resuming', 'running'], resuming: ['resuming', 'running', 'paused'],
  completed: [], failed: [], cancelled: [], interrupted: [],
};
// The status that proves a command succeeded (acceptance alone does not).
const destinations = { run: 'running', pause: 'paused', resume: 'running', cancel: 'cancelled' } as const;

/**
 * Pure rules; the repository locks the execution and persists sequence + state atomically.
 *
 * Returns ONLY the columns that should change (a partial RunState), or null for "nothing to do".
 * Throws RunEventContractError when the event contradicts the rules.
 * `now` is passed in (instead of calling new Date() here) so tests are deterministic.
 */
export function applyRunEvent(current: RunState, event: RunEvent, now: Date): RunEventChanges | null {
  validateRunIdentity(current, event);
  const emittedAt = new Date(event.emitted_at);
  // The engine's own run id is optional in events. When present we store it (first time = "bind");
  // validateRunIdentity already rejected an attempt to replace a different one.
  const identity = event.run_id ? { engineRunId: event.run_id } : {};
  // ---- CASE 1: heartbeat -------------------------------------------------------------------
  if (event.event_type === 'run.heartbeat') {
    // Health is observational: never change lifecycle, results, commands, or sequence.
    // Replayed/older health reports cannot refresh reporting freshness.
    if (terminal.has(current.status) || (current.heartbeatEmittedAt && emittedAt <= current.heartbeatEmittedAt)) return null;
    // TODO: agree clock skew and meaningful progress semantics before alert evaluation.
    return { ...identity, heartbeatEmittedAt: emittedAt, heartbeatReceivedAt: now,
      ...(event.progress ? { progress: event.progress } : {}) };
  }
  // ---- Sequenced events (status / result) ------------------------------------------------------
  // Already applied => nothing to do.
  if (event.sequence <= current.lastEventSequence) return null;
  // A gap is held durably by the repository; this function never guesses past it.
  // (planRunEvents only calls us with exactly lastEventSequence + 1; this is a safety net.)
  if (event.sequence !== current.lastEventSequence + 1) throw new RunEventContractError();
  const changes: RunEventChanges = { ...identity, updatedAt: now, lastEventSequence: event.sequence };
  // ---- CASE 2: result ----------------------------------------------------------------------
  if (event.event_type === 'run.result') {
    // Results enrich completed/failed executions; they cannot manufacture success.
    if (!['completed', 'failed', 'interrupted'].includes(current.status) || current.resultEventAt !== null) {
      throw new RunEventContractError();
    }
    return { ...changes, results: event.results, resultEventAt: emittedAt };
  }
  // ---- CASE 3: status ------------------------------------------------------------------------
  // After termination only the mandatory result is applicable. Inconsistent new
  // status events are reported; do not acknowledge them as harmless duplicates.
  if (terminal.has(current.status)) throw new RunEventContractError();
  // Does this event answer the command currently pending on the run? It must echo both the action
  // (command_id) and its counter (command_sequence), otherwise it is about an older/newer request.
  const matching =current.pendingCommand !== null && event.command_id === current.pendingCommand &&
    event.command_sequence === current.commandSequence;
  // A terminal state resolves the execution even if its command metadata refers
  // to an older action. Never use that metadata to resolve a newer command as successful.
  if (event.command_id !== undefined && !matching && !terminal.has(event.status)) throw new RunEventContractError();
  // A rejected pause/resume/cancel must leave the confirmed status unchanged (the run keeps doing what it was).
  // ('run' is different: a rejected run must report `failed`, enforced by the event schema.)
  if (event.decision === 'rejected' && event.command_id !== 'run' && !terminal.has(event.status) && event.status !== current.status) {
    throw new RunEventContractError();
  }
  // Lifecycle guard: refuse moves that go backwards (e.g. running -> accepted).
  if (!terminal.has(event.status) && !transitions[current.status].includes(event.status)) throw new RunEventContractError();
  // Record the confirmed status plus the optional text/reference fields the engine supplied.
  Object.assign(changes, { status: event.status, statusEventAt: emittedAt },
    event.reason !== undefined && event.decision !== 'rejected' ? { reason: event.reason } : {},
    event.message !== undefined ? { statusMessage: event.message } : {},
    event.engine_ref ? { engineRef: JSON.stringify(event.engine_ref) } : {});
  if (matching) {
    if (event.decision != null) changes.decision = event.decision;
    if (event.reason !== undefined) changes.commandReason = event.reason;
    // Acceptance alone keeps the request pending. Only its correlated destination
    // or rejection resolves it; unrelated snapshots cannot unlock another command.
    if (event.decision === 'rejected' || destinations[current.pendingCommand!] === event.status) {
      changes.pendingCommand = null;
    }
  }
  if (terminal.has(event.status)) {
    // A terminal outcome wins a race with any pending action. Clearing is not a
    // claim that the action succeeded. Results are still expected after failure/success.
    Object.assign(changes, { completedAt: emittedAt, pendingCommand: null });
    if (event.reason !== undefined) changes.reason = event.reason;
  }
  return changes;
}
