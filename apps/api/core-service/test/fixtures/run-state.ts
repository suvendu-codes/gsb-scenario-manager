import type { RunState } from '../../src/runs/domain/run-state.js';
import type { RunEvent } from '../../src/status-worker/domain/run-event.js';
export const time = new Date('2026-10-25T10:00:00Z');
export const seed: RunState = {
  id: 'run-id', scenarioId: 'scenario-id', correlationId: 'cid', engineRunId: null,
  engine: 'emulator', status: 'accepted', verdict: null, reason: null, results: {},
  pendingCommand: null, commandSequence: null, decision: null, commandReason: null,
  lastEventSequence: 0, recoveryRequired: false, heartbeatEmittedAt: null,
  heartbeatReceivedAt: null, progress: null,
  engineRef: null, statusMessage: null, statusEventAt: null, resultEventAt: null,
  createdAt: time, updatedAt: time, completedAt: null,
};
export const status = (overrides: Partial<Extract<RunEvent, { event_type: 'run.status' }>> = {}): Extract<RunEvent, { event_type: 'run.status' }> => ({
  event_type: 'run.status', correlation_id: 'cid', run_id: 'engine-run', engine: 'emulator',
  sequence: 1, status: 'running', emitted_at: time.toISOString(), ...overrides,
});
export const result = (sequence = 2): Extract<RunEvent, { event_type: 'run.result' }> => ({
  event_type: 'run.result', correlation_id: 'cid', engine: 'emulator', sequence,
  emitted_at: time.toISOString(), results: { nested: { custom: [1, null, true] } },
});
