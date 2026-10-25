import type { RunState } from '../../runs/domain/run-state.js';
import { RunNotFoundError, type RunEventRepository } from '../application/ports/run-event.repository.js';
import { planRunEvents } from '../domain/plan-run-events.js';
import type { OrderedRunEvent, RunEvent } from '../domain/run-event.js';
import { scenarioStatusForRun, type ScenarioRunState } from '../domain/scenario-run-state.js';

/** Development/test storage only; production DI always uses PostgreSQL. */
export class InMemoryRunEventRepository implements RunEventRepository {
  private readonly receipts = new Map<string, OrderedRunEvent[]>();
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
    const receipts = this.receipts.get(current.id) ?? [];
    const plan = planRunEvents(current, event, receipts, new Date());
    const changes = plan.changes;
    if (!changes) return plan.outcome;
    const updated = { ...current, ...structuredClone(changes) };
    const status = scenarioStatusForRun(owner, updated);
    // No awaits between read and writes: one synchronous in-memory operation.
    if (plan.receipt) this.receipts.set(current.id, [...receipts, structuredClone(plan.receipt)]);
    this.rows.set(current.correlationId, updated);
    if (status !== null) this.scenarios.set(owner.id, { ...owner, status });
    return plan.outcome;
  }
  snapshot() { return structuredClone([...this.rows.values()]); }
  scenarioSnapshot() { return structuredClone([...this.scenarios.values()]); }
}
