import type { RunState } from './run-state.js';
export type RunStatus = RunState['status'];

export class Run {
  runId!: string;
  scenarioId!: string;
  scenarioVersionId!: string;
  status!: RunStatus;
  engineRef!: string | null;
  createdAt!: string;
}

export interface NewRun {
  scenarioId: string;
  scenarioVersionId: string;
  engine: string;
  triggeredBy: string;
  idempotencyKey: string;
}
