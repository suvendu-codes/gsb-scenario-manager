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
  /** SM primary key (`run.id`). The engine's id is `engineRunId` (`run.run_id`). */
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
