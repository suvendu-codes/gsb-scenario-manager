import type { RunState } from '../../runs/domain/run-state.js';
import { ScenarioStatus } from '../../scenarios/domain/scenario-status.js';

export interface ScenarioRunState {
  id: string;
  currentRunId: string | null;
  status: ScenarioStatus;
}

/** Only the explicitly selected current execution may change its scenario. */
export function scenarioStatusForRun(scenario: ScenarioRunState, run: RunState): ScenarioStatus | null {
  if (scenario.id !== run.scenarioId || scenario.currentRunId !== run.id) return null;
  switch (run.status) {
    case 'completed':
    case 'failed':
    case 'interrupted':
    case 'cancelled':
      return ScenarioStatus.Finished;
    case 'paused':
      return ScenarioStatus.Paused;
    default:
      return ScenarioStatus.Running;
  }
}
