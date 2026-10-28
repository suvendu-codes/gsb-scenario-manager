import type { RunState } from '../../runs/domain/run-state.js';
import { ScenarioStatus } from '../../scenarios/domain/scenario-status.js';

export interface ScenarioRunState {
  id: string;
  currentRunId: string | null;
  status: ScenarioStatus;
}

/**
 * Only the explicitly selected current execution may change its scenario.
 *
 * Mapping from a run's status to the scenario's status shown to users:
 *   completed / failed / interrupted / cancelled  ->  finished
 *   paused / resuming                             ->  paused
 *   everything else (accepted, setup_ready, running, ...) -> running
 * Returns null ("do not touch the scenario") when the run is not the scenario's current_run_id,
 * e.g. a late event from an old retry. The caller additionally skips the write if the value is unchanged.
 */
export function scenarioStatusForRun(scenario: ScenarioRunState, run: RunState): ScenarioStatus | null {
  if (scenario.id !== run.scenarioId || scenario.currentRunId !== run.id) return null;
  switch (run.status) {
    case 'completed':
    case 'failed':
    case 'interrupted':
    case 'cancelled':
      return ScenarioStatus.Finished;
    case 'paused':
    case 'resuming':
      return ScenarioStatus.Paused;
    default:
      return ScenarioStatus.Running;
  }
}
