import { Injectable } from '@nestjs/common';
import { InMemoryOutboxStore } from '../../outbox/infrastructure/in-memory-outbox.store.js';
import { ScenarioNotFoundError } from '../../scenarios/domain/errors.js';
import type {
  RunTriggerRepository,
  TriggerContext,
  TriggerOutcome,
  TriggerPlan,
} from '../application/ports/run-trigger.repository.js';
import { ActiveRunExistsError } from '../domain/errors.js';
import { isTerminalRunStatus, type Run } from '../domain/run.js';
import type { TriggerScenarioSnapshot } from '../domain/run-trigger-event.js';

/**
 * Single-process stand-in for DrizzleRunTriggerRepository: per-scenario serialisation mimics the
 * row lock, and a failing step leaves no partial writes (all-or-nothing like the transaction).
 */
@Injectable()
export class InMemoryRunTriggerRepository implements RunTriggerRepository {
  readonly scenarios = new Map<string, TriggerScenarioSnapshot>();
  readonly runs: Run[] = [];
  /** scenario id → current_run_id, as the Drizzle repository sets it. */
  readonly currentRunIds = new Map<string, string>();
  private readonly locks = new Map<string, Promise<unknown>>();
  /** Test hook: throw after the run is staged to prove nothing is persisted. */
  failOutboxInsert = false;

  constructor(
    readonly outbox: InMemoryOutboxStore = new InMemoryOutboxStore(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  seedScenario(snapshot: TriggerScenarioSnapshot) {
    this.scenarios.set(snapshot.id, structuredClone(snapshot));
  }

  trigger(
    scenarioId: string,
    idempotencyKey: string | null,
    plan: (ctx: TriggerContext) => TriggerPlan,
  ): Promise<TriggerOutcome> {
    const previous = this.locks.get(scenarioId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(() => this.apply(scenarioId, idempotencyKey, plan));
    this.locks.set(scenarioId, next);
    return next;
  }

  private async apply(
    scenarioId: string,
    idempotencyKey: string | null,
    plan: (ctx: TriggerContext) => TriggerPlan,
  ): Promise<TriggerOutcome> {
    await Promise.resolve(); // let concurrent callers interleave like real I/O
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) throw new ScenarioNotFoundError(scenarioId);

    if (idempotencyKey) {
      const existing = this.runs.find((r) => r.scenarioId === scenarioId && r.idempotencyKey === idempotencyKey);
      if (existing) return { kind: 'existing', run: structuredClone(existing) };
    }

    const active = this.runs.find((r) => r.scenarioId === scenarioId && !isTerminalRunStatus(r.status));
    const planned = plan({
      scenario: structuredClone(scenario),
      activeRun: active ? { id: active.id, status: active.status } : null,
    });

    if (this.runs.some((r) => r.scenarioId === scenarioId && !isTerminalRunStatus(r.status))) {
      throw new ActiveRunExistsError(scenarioId);
    }
    if (this.failOutboxInsert) throw new Error('simulated outbox insert failure');

    const run: Run = { ...planned.run, createdAt: this.now() };
    this.outbox.insert(planned.outbox); // throws on duplicate key before anything is committed
    this.runs.push(run);
    scenario.status = planned.scenarioStatus;
    this.currentRunIds.set(scenarioId, run.id);
    return { kind: 'created', run: structuredClone(run), outboxId: planned.outbox.id };
  }
}
