export const runStatusValues = Object.freeze([
  'accepted', 'queued', 'provisioning', 'setup_ready', 'running', 'paused',
  'completed', 'failed', 'interrupted', 'cancelled',
] as const);
export const runVerdictValues = Object.freeze(['success', 'failure', 'inconclusive'] as const);
export const runEngineValues = Object.freeze(['emulator', 'simulator'] as const);

/** Storage-neutral state consumed by run lifecycle rules. */
export interface RunState {
  id: string;
  correlationId: string;
  scenarioId: string;
  engineRunId: string | null;
  engine: typeof runEngineValues[number];
  status: typeof runStatusValues[number];
  verdict: typeof runVerdictValues[number] | null;
  reason: string | null;
  results: unknown;
  engineRef: string | null;
  statusMessage: string | null;
  statusEventAt: Date | null;
  resultEventAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}
