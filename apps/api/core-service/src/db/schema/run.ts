import { desc, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { runCommand, runEngine, runPriority, runStatus, runVerdict } from './enums.js';
import { scenario } from './scenario.js';

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
    priority: runPriority().notNull().default('normal'),
    /** The single unresolved SM command for this execution (Event Schema §3), cleared by the status worker. */
    pendingCommand: runCommand('pending_command'),
    /** Last SM command sequence issued for this execution; the next command uses +1. */
    commandSequence: integer('command_sequence').notNull().default(0),
    issuedBy: text('issued_by'),
    /** Client Idempotency-Key for the trigger request, scoped to the scenario. */
    idempotencyKey: text('idempotency_key'),
    /** SHA-256 of the canonical trigger request; a replayed key with a different body is a conflict. */
    requestHash: text('request_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    unique('run_correlation_id_key').on(t.correlationId),
    unique('run_scenario_idempotency_key').on(t.scenarioId, t.idempotencyKey),
    index('run_scenario_idx').on(t.scenarioId, desc(t.createdAt)),
    index('run_status_idx').on(t.status),
    // A scenario may have many historical executions but only one nonterminal one.
    uniqueIndex('run_one_active_per_scenario')
      .on(t.scenarioId)
      .where(sql`${t.status} NOT IN ('completed', 'failed', 'cancelled', 'interrupted')`),
    check('run_command_sequence_valid', sql`${t.commandSequence} >= 0`),
  ],
);
