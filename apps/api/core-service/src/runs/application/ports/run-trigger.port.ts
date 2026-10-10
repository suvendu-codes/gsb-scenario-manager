export interface RunTriggerRequest {
  runId: string;
  engine: string;
  scenarioId: string;
  scenarioVersionId: string;
  configUri: string;
}

/** Starts a run in the downstream engine and returns its reference. */
export interface RunTrigger {
  start(request: RunTriggerRequest): Promise<{ engineRef: string }>;
}

export const RUN_TRIGGER = Symbol('RUN_TRIGGER');
