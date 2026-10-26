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
] as const);
export const runStatus = pgEnum('run_status', runStatusValues);

export const runVerdictValues = freeze(['success', 'failure', 'inconclusive'] as const);
export const runVerdict = pgEnum('run_verdict', runVerdictValues);

export const runEngineValues = freeze(['emulator', 'simulator'] as const);
export const runEngine = pgEnum('run_engine', runEngineValues);
