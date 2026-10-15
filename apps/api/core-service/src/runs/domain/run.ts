export type RunStatus =
  | 'accepted'
  | 'queued'
  | 'provisioning'
  | 'setup_ready'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'interrupted'
  | 'cancelled';

export class Run {
  runId!: string;
  scenarioId!: string;
  correlationId!: string;
  engineRunId!: string | null;
  reason!: string | null;
  status!: RunStatus;
  engineRef!: string | null;
  createdAt!: string;
}

export interface NewRun {
  scenarioId: string;
  engine: string;
  correlationId: string;
}
