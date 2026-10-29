import { commandValues, runEngineValues, type RunState } from './run-state.js';

export type RunStatus = RunState['status'];
export type RunEngine = (typeof runEngineValues)[number];
export type RunCommand = (typeof commandValues)[number];

export const RUN_ENGINES = runEngineValues;
export const RUN_PRIORITIES = Object.freeze(['high', 'normal', 'low'] as const);
export type RunPriority = (typeof RUN_PRIORITIES)[number];

/** Must match the run_one_active_per_scenario predicate in db/schema.sql. */
export const TERMINAL_RUN_STATUSES = Object.freeze(['completed', 'failed', 'interrupted', 'cancelled'] as const);
const TERMINAL: ReadonlySet<string> = new Set(TERMINAL_RUN_STATUSES);

/** completed, failed, cancelled (and legacy interrupted) end an execution; a new Run may follow. */
export const isTerminalRunStatus = (status: RunStatus) => TERMINAL.has(status);

/** Terminal outcomes after which the scenario may be run again (LLD: failed or cancelled). */
const RETRYABLE: ReadonlySet<string> = new Set(['failed', 'cancelled', 'interrupted']);
export const isRetryableRunStatus = (status: RunStatus) => RETRYABLE.has(status);

/** A persisted SM execution as the trigger flow sees it. */
export interface Run {
  id: string;
  scenarioId: string;
  correlationId: string;
  engine: RunEngine;
  status: RunStatus;
  priority: RunPriority;
  pendingCommand: RunCommand | null;
  commandSequence: number | null;
  /** The earlier failed/cancelled run this execution retries, if any. */
  retryOfRunId: string | null;
  triggeredBy: string;
  /** Upstream versions resolved and pinned at trigger time. */
  mapVersion: string | null;
  sizerVersion: string | null;
  /** Create-only blob holding the effective config sent to the engine. */
  configSnapshotUri: string | null;
  idempotencyKey: string | null;
  requestHash: string | null;
  createdAt: Date;
}

/** Fields the trigger flow writes for a brand-new execution. */
export type NewRun = Omit<Run, 'createdAt'>;
