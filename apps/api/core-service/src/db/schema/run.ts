import { desc } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { runEngine, runStatus, runVerdict } from './enums';
import { scenario } from './scenario';

export const run = pgTable(
  'run',
  {
    id: uuid().primaryKey().defaultRandom(),
    correlationId: text('correlation_id').notNull(),
    engineRunId: text('run_id'),
    scenarioId: uuid('scenario_id')
      .notNull()
      .references(() => scenario.id),
    engine: runEngine().notNull(),
    status: runStatus().notNull().default('accepted'),
    verdict: runVerdict(),
    reason: text(),
    results: jsonb().notNull().default({}),
    engineRef: text('engine_ref'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    unique('run_correlation_id_key').on(t.correlationId),
    index('run_scenario_idx').on(t.scenarioId, desc(t.createdAt)),
    index('run_status_idx').on(t.status),
  ],
);
