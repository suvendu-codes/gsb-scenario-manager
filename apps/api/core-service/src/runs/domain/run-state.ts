// Earlier setup/terminal labels remain in the storage model. New producers use
// the documented lifecycle; a failure reason such as interrupted is not a new state.
export const runStatusValues = Object.freeze([
  'trigger_requested', 'accepted', 'queued', 'provisioning', 'setup_ready', 'running',
  'paused', 'resuming', 'completed', 'failed', 'interrupted', 'cancelled',
] as const);
export const engineRunStatusValues = Object.freeze([
  'accepted', 'setup_ready', 'running', 'paused', 'resuming', 'completed', 'failed', 'cancelled',
] as const);
export const commandValues = Object.freeze(['run', 'pause', 'resume', 'cancel'] as const);
export const decisionValues = Object.freeze(['accepted', 'rejected'] as const);
// Earlier DB enum/column is read-only; events no longer carry verdict.
// TODO: remove unused verdict storage in a reviewed baseline/model cleanup.
export const runVerdictValues = Object.freeze(['success', 'failure', 'inconclusive'] as const);
export const runEngineValues = Object.freeze(['emulator', 'simulator'] as const);

/** Storage-neutral execution state. Pending requests never overwrite confirmed state. */
export interface RunState {
  id: string; correlationId: string; scenarioId: string; engineRunId: string | null;
  engine: typeof runEngineValues[number]; status: typeof runStatusValues[number];
  verdict: typeof runVerdictValues[number] | null;
  pendingCommand: typeof commandValues[number] | null;
  commandSequence: number | null;
  decision: typeof decisionValues[number] | null;
  commandReason: string | null;
  lastEventSequence: number;
  recoveryRequired: boolean;
  heartbeatEmittedAt: Date | null;
  heartbeatReceivedAt: Date | null;
  progress: unknown;
  reason: string | null; results: unknown; engineRef: string | null;
  statusMessage: string | null; statusEventAt: Date | null; resultEventAt: Date | null;
  createdAt: Date; updatedAt: Date; completedAt: Date | null;
}
