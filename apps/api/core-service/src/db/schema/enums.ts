import { pgEnum } from 'drizzle-orm/pg-core';

export const scenarioStatus = pgEnum('scenario_status', ['draft', 'active', 'completed']);

export const runStatus = pgEnum('run_status', [
  'accepted',
  'setup_ready',
  'running',
  'paused',
  'completed',
  'failed',
  'interrupted',
]);
