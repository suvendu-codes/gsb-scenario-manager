import type { RunState } from '../../runs/domain/run-state.js';
import { RunNotFoundError, type RunEventRepository } from '../application/ports/run-event.repository.js';
import { applyRunEvent } from '../domain/apply-run-event.js';
import type { RunEvent } from '../domain/run-event.js';
import { scenarioStatusForRun, type ScenarioRunState } from '../domain/scenario-run-state.js';

/** Development/test storage only; production DI always uses PostgreSQL. */
export class InMemoryRunEventRepository implements RunEventRepository {
  private readonly rows = new Map<string, RunState>();
  private readonly scenarios = new Map<string, ScenarioRunState>();
  constructor(rows: RunState[], scenarios: ScenarioRunState[]) {
    for (const row of rows) this.rows.set(row.correlationId, structuredClone(row));
    for (const scenario of scenarios) this.scenarios.set(scenario.id, structuredClone(scenario));
  }
  async apply(event: RunEvent) {
    const current = this.rows.get(event.correlation_id);
    if (!current) throw new RunNotFoundError();
    const owner = this.scenarios.get(current.scenarioId);
    if (!owner) throw new Error('Run scenario is missing');
    const changes = applyRunEvent(current, event, new Date());
    if (!changes) return 'ignored' as const;
    const updated = { ...current, ...structuredClone(changes) };
    const status = scenarioStatusForRun(owner, updated);
    // No awaits between read and writes: one synchronous in-memory operation.
    this.rows.set(current.correlationId, updated);
    if (status !== null) this.scenarios.set(owner.id, { ...owner, status });
    return 'updated' as const;
  }
  snapshot() { return structuredClone([...this.rows.values()]); }
  scenarioSnapshot() { return structuredClone([...this.scenarios.values()]); }
}
