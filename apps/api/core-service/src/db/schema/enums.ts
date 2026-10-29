import { runStatusValues, runVerdictValues, runEngineValues } from '../../runs/domain/run-state.js';
export { runStatusValues, runVerdictValues, runEngineValues } from '../../runs/domain/run-state.js';
import { pgEnum } from 'drizzle-orm/pg-core';

const freeze = <const T extends readonly [string, ...string[]]>(values: T): T =>
  Object.freeze(values) as T;

export const scenarioStatusValues = freeze(['draft', 'running', 'paused', 'finished'] as const);
export const scenarioStatus = pgEnum('scenario_status', scenarioStatusValues);

export const runStatus = pgEnum('run_status', runStatusValues);
export const runVerdict = pgEnum('run_verdict', runVerdictValues);
export const runEngine = pgEnum('run_engine', runEngineValues);
