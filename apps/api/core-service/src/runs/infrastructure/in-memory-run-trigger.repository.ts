import { Injectable } from '@nestjs/common';
import { InMemoryOutboxStore } from '../../outbox/infrastructure/in-memory-outbox.store.js';
import { ScenarioNotFoundError } from '../../scenarios/domain/errors.js';
import type {
  CommitTrigger,
  RunTriggerRepository,
  TriggerOutcome,
  TriggerScenarioState,
} from '../application/ports/run-trigger.repository.js';
import { isTerminalRunStatus, type Run } from '../domain/run.js';

export type SeedScenario = Omit<TriggerScenarioState, 'recentRuns'>;

/**
 * Single-process stand-in for DrizzleRunTriggerRepository: per-scenario serialisation mimics the
 * row lock, and a failing step leaves no partial writes (all-or-nothing like the transaction).
 */
@Injectable()
export class InMemoryRunTriggerRepository implements RunTriggerRepository {
  readonly scenarios = new Map<string, SeedScenario>();
  readonly runs: Run[] = [];
  /** scenario id → current_run_id, as the Drizzle repository sets it. */
  readonly currentRunIds = new Map<string, string>();
  private readonly locks = new Map<string, Promise<unknown>>();
  private seq = 0;
  /** Test hook: throw inside the commit to prove nothing is persisted. */
  failOutboxInsert = false;

  constructor(
    readonly outbox: InMemoryOutboxStore = new InMemoryOutboxStore(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  seedScenario(state: SeedScenario) {
    this.scenarios.set(state.id, structuredClone(state));
  }

  /** Adds a historical run directly (as the status worker would have left it). */
  seedRun(run: Pick<Run, 'id' | 'scenarioId' | 'correlationId' | 'status'> & Partial<Run>) {
    this.runs.push({
      engine: 'emulator',
      priority: 'normal',
      pendingCommand: null,
      commandSequence: 1,
      retryOfRunId: null,
      triggeredBy: 'seed',
      mapVersion: null,
      sizerVersion: null,
      configSnapshotUri: null,
      idempotencyKey: null,
      requestHash: null,
      createdAt: new Date(this.now().getTime() + this.seq++),
      ...run,
    });
  }

  async findByIdempotencyKey(scenarioId: string, key: string) {
    const found = this.runs.find((r) => r.scenarioId === scenarioId && r.idempotencyKey === key);
    return found ? structuredClone(found) : null;
  }

  async loadScenario(scenarioId: string, recentRuns: number): Promise<TriggerScenarioState | null> {
    const state = this.scenarios.get(scenarioId);
    if (!state) return null;
    return { ...structuredClone(state), recentRuns: this.latest(scenarioId, recentRuns) };
  }

  commit(input: CommitTrigger): Promise<TriggerOutcome> {
    const previous = this.locks.get(input.scenarioId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(() => this.apply(input));
    this.locks.set(input.scenarioId, next);
    return next;
  }

  private latest(scenarioId: string, n: number) {
    return this.runs
      .filter((r) => r.scenarioId === scenarioId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, n)
      .map(({ id, correlationId, status }) => ({ id, correlationId, status }));
  }

  private async apply(input: CommitTrigger): Promise<TriggerOutcome> {
    await Promise.resolve(); // let concurrent callers interleave like real I/O
    const scenario = this.scenarios.get(input.scenarioId);
    if (!scenario) throw new ScenarioNotFoundError(input.scenarioId);

    const existing = this.runs.find((r) => r.scenarioId === input.scenarioId && r.idempotencyKey === input.idempotencyKey);
    if (existing) return { kind: 'existing', run: structuredClone(existing) };

    const [latest] = this.latest(input.scenarioId, 1);
    if (scenario.status !== input.expected.status || (latest?.id ?? null) !== input.expected.latestRunId) {
      return {
        kind: 'changed',
        status: scenario.status,
        activeRunCorrelationId: latest && !isTerminalRunStatus(latest.status) ? latest.correlationId : null,
      };
    }
    if (this.failOutboxInsert) throw new Error('simulated outbox insert failure');

    const run: Run = { ...input.run, createdAt: new Date(this.now().getTime() + this.seq++) };
    this.outbox.insert(input.outbox); // throws on duplicate key before anything is committed
    this.runs.push(run);
    scenario.status = 'running';
    this.currentRunIds.set(input.scenarioId, run.id);
    return { kind: 'created', run: structuredClone(run) };
  }
}
