import type { OutboxMessageDraft } from '../../../outbox/domain/outbox-message.js';
import type { NewRun, Run, RunEngine } from '../../domain/run.js';
import type { DataSlot } from '../../domain/scenario-readiness.js';

/** Scenario facts the trigger validates before it writes anything. */
export interface TriggerScenarioState {
  id: string;
  projectId: string;
  mapId: string;
  status: string;
  /** Stored config: inline body, or a blob URI to read. Both null when none was saved. */
  config: { body: Record<string, unknown> | null; uri: string | null };
  dataUris: Record<DataSlot, string | null>;
  /** The scenario's runs, newest first (enough for the failure brake). */
  recentRuns: Pick<Run, 'id' | 'correlationId' | 'status'>[];
}

export interface CommitTrigger {
  scenarioId: string;
  idempotencyKey: string;
  /** What validation saw; the commit refuses if the scenario moved on meanwhile. */
  expected: { status: string; latestRunId: string | null };
  run: NewRun;
  outbox: OutboxMessageDraft;
}

export type TriggerOutcome =
  | { kind: 'created'; run: Run }
  /** The same Idempotency-Key won a concurrent race. */
  | { kind: 'existing'; run: Run }
  /** Status or latest run changed after validation (e.g. a concurrent trigger). */
  | { kind: 'changed'; status: string; activeRunCorrelationId: string | null };

export interface RunTriggerRepository {
  findByIdempotencyKey(scenarioId: string, key: string): Promise<Run | null>;
  loadScenario(scenarioId: string, recentRuns: number): Promise<TriggerScenarioState | null>;
  /**
   * One transaction: lock the scenario, re-check the key and the expected state, insert the run and
   * its outbox row, set the scenario to running with current_run_id = the new run.
   */
  commit(input: CommitTrigger): Promise<TriggerOutcome>;
}
export const RUN_TRIGGER_REPOSITORY = Symbol('RUN_TRIGGER_REPOSITORY');

/** Upstream abstraction (Foundry API). Serves mock data until the real connection lands. */
export type UpstreamResolution =
  | { ok: true; mapVersion: string; sizerVersion: string }
  | { ok: false; issues: ('map_not_found' | 'sizer_not_found' | 'data_file_map_mismatch')[] };

export interface RunUpstream {
  /** Checks the map and sizer exist and resolves their exact versions. @throws when upstream is unreachable. */
  resolve(input: { projectId: string; mapId: string }): Promise<UpstreamResolution>;
}
export const RUN_UPSTREAM = Symbol('RUN_UPSTREAM');

export interface ConfigSnapshotStore {
  /** Writes the effective config once; never overwrites. Returns its URI. @throws on storage failure. */
  writeOnce(path: string, config: Record<string, unknown>): Promise<string>;
}
export const CONFIG_SNAPSHOT_STORE = Symbol('CONFIG_SNAPSHOT_STORE');

/** Trigger topic per engine. */
export type CommandTopics = Readonly<Record<RunEngine, string>>;
export const COMMAND_TOPICS = Symbol('COMMAND_TOPICS');

export const EVENT_SCHEMA_VERSION = Symbol('EVENT_SCHEMA_VERSION');

/** Engines whose manual gate is closed (503 engine_unavailable). */
export type EngineGate = Readonly<{ closed: readonly RunEngine[] }>;
export const ENGINE_GATE = Symbol('ENGINE_GATE');

export interface Clock {
  now(): Date;
}
export const CLOCK = Symbol('CLOCK');
export const systemClock: Clock = { now: () => new Date() };

export interface IdGenerator {
  uuid(): string;
}
export const ID_GENERATOR = Symbol('ID_GENERATOR');
