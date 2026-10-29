import { pgEnum } from 'drizzle-orm/pg-core';

const freeze = <const T extends readonly [string, ...string[]]>(values: T): T =>
  Object.freeze(values) as T;

export const scenarioStatusValues = freeze(['draft', 'running', 'paused', 'finished'] as const);
export const scenarioStatus = pgEnum('scenario_status', scenarioStatusValues);

export const runStatusValues = freeze([
  'accepted',
  'queued',
  'provisioning',
  'setup_ready',
  'running',
  'paused',
  'completed',
  'failed',
  'interrupted',
  'cancelled',
  // Added for the outbox flow (Event Schema Proposal §2): SM recorded the request, engine acceptance pending.
  'trigger_requested',
  'resuming',
] as const);
export const runStatus = pgEnum('run_status', runStatusValues);

/** Run states after which no further transition is expected and a new execution may start. */
export const terminalRunStatusValues = freeze([
  'completed',
  'failed',
  'cancelled',
  'interrupted',
] as const);

export const runVerdictValues = freeze(['success', 'failure', 'inconclusive'] as const);
export const runVerdict = pgEnum('run_verdict', runVerdictValues);

export const runEngineValues = freeze(['emulator', 'simulator'] as const);
export const runEngine = pgEnum('run_engine', runEngineValues);

/** command_id on the wire: the action, not a unique request id. */
export const runCommandValues = freeze(['run', 'pause', 'resume', 'cancel'] as const);
export const runCommand = pgEnum('run_command', runCommandValues);

export const runPriorityValues = freeze(['high', 'normal', 'low'] as const);
export const runPriority = pgEnum('run_priority', runPriorityValues);

/**
 * pending   – waiting to be (re)sent; may be leased by a worker (locked_by / locked_until).
 * published – Kafka acknowledged the record (acks=all).
 * dead      – a non-retriable failure or max attempts reached; needs operator action.
 */
export const outboxStatusValues = freeze(['pending', 'published', 'dead'] as const);
export const outboxStatus = pgEnum('outbox_status', outboxStatusValues);
