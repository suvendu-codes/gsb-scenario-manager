import type { OutboxMessageDraft } from '../../../outbox/domain/outbox-message.js';
import type { NewRun, Run } from '../../domain/run.js';
import type { TriggerScenarioSnapshot } from '../../domain/run-trigger-event.js';

/** What the repository hands the planner, read under the scenario row lock. */
export interface TriggerContext {
  scenario: TriggerScenarioSnapshot;
  /** The scenario's nonterminal run, if any. */
  activeRun: Pick<Run, 'id' | 'status'> | null;
}

/** What the planner asks the repository to write atomically. */
export interface TriggerPlan {
  run: NewRun;
  outbox: OutboxMessageDraft;
  /** New scenario status (e.g. running). */
  scenarioStatus: 'running';
}

export type TriggerOutcome =
  | { kind: 'created'; run: Run; outboxId: string }
  | { kind: 'existing'; run: Run };

export interface RunTriggerRepository {
  /**
   * In ONE transaction: lock the scenario row, return the run already created for
   * `idempotencyKey` (if any), otherwise call `plan` and persist run + outbox row + scenario
   * status together. Errors thrown by `plan` roll everything back.
   *
   * @throws ScenarioNotFoundError when the scenario does not exist.
   * @throws ActiveRunExistsError when the one-active-run index rejects the insert.
   */
  trigger(
    scenarioId: string,
    idempotencyKey: string | null,
    plan: (ctx: TriggerContext) => TriggerPlan,
  ): Promise<TriggerOutcome>;
}

export const RUN_TRIGGER_REPOSITORY = Symbol('RUN_TRIGGER_REPOSITORY');

/** Trigger topic per engine. */
export type CommandTopics = Readonly<Record<'emulator' | 'simulator', string>>;
export const COMMAND_TOPICS = Symbol('COMMAND_TOPICS');

export const EVENT_SCHEMA_VERSION = Symbol('EVENT_SCHEMA_VERSION');

export interface Clock {
  now(): Date;
}
export const CLOCK = Symbol('CLOCK');
export const systemClock: Clock = { now: () => new Date() };

export interface IdGenerator {
  uuid(): string;
}
export const ID_GENERATOR = Symbol('ID_GENERATOR');
