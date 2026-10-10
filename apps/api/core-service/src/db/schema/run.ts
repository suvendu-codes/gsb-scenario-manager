import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { desc } from 'drizzle-orm';
import { runStatus } from './enums';
import { scenario } from './scenario';
import { scenarioVersion } from './scenario-version';

export const run = pgTable(
  'run',
  {
    id: uuid().primaryKey().defaultRandom(),
    scenarioId: uuid('scenario_id')
      .notNull()
      .references(() => scenario.id),
    scenarioVersionId: uuid('scenario_version_id')
      .notNull()
      .references(() => scenarioVersion.id),
    engine: text().notNull(),
    status: runStatus().notNull().default('triggering'),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    engineRef: text('engine_ref'),
    resultsSummary: jsonb('results_summary'),
    verdict: text(),
    triggeredBy: text('triggered_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    index('run_scenario_idx').on(t.scenarioId, desc(t.createdAt)),
    index('run_status_idx').on(t.status),
  ],
);
