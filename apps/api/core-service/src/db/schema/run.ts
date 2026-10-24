import { desc, sql } from 'drizzle-orm';
import { check, foreignKey, index, jsonb, pgTable, text, timestamp, unique, uniqueIndex, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { runEngine, runStatus, runVerdict } from './enums.js';
import { scenario } from './scenario.js';

export const run = pgTable(
  'run',
  {
    id: uuid().primaryKey().defaultRandom(),
    correlationId: text('correlation_id').notNull(),
    engineRunId: text('run_id'),
    scenarioId: uuid('scenario_id')
      .notNull()
      .references((): AnyPgColumn => scenario.id),
    retryOfRunId: uuid('retry_of_run_id'),
    engine: runEngine().notNull(),
    status: runStatus().notNull().default('accepted'),
    verdict: runVerdict(),
    reason: text(),
    results: jsonb().notNull().default({}),
    engineRef: text('engine_ref'),
    statusMessage: text('status_message'),
    statusEventAt: timestamp('status_event_at', { withTimezone: true }),
    resultEventAt: timestamp('result_event_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    unique('run_correlation_id_key').on(t.correlationId),
    unique('run_scenario_id_id_key').on(t.scenarioId, t.id),
    uniqueIndex('run_one_active_per_scenario').on(t.scenarioId)
      .where(sql`${t.status} NOT IN ('completed', 'failed', 'interrupted', 'cancelled')`),
    foreignKey({ name: 'run_retry_same_scenario_fk', columns: [t.scenarioId, t.retryOfRunId], foreignColumns: [t.scenarioId, t.id] }),
    check('run_retry_not_self', sql`${t.retryOfRunId} IS NULL OR ${t.retryOfRunId} <> ${t.id}`),
    index('run_scenario_idx').on(t.scenarioId, desc(t.createdAt)),
    index('run_status_idx').on(t.status),
  ],
);
