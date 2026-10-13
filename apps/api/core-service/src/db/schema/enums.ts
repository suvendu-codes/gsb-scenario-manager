import { pgEnum } from 'drizzle-orm/pg-core';

export const scenarioStatus = pgEnum('scenario_status', ['draft', 'active', 'completed']);

export const runStatus = pgEnum('run_status', [
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
]);

export const runVerdict = pgEnum('run_verdict', ['success', 'failure', 'inconclusive']);

export const runEngine = pgEnum('run_engine', ['emulator', 'simulator']);
