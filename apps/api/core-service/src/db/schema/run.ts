import { desc, sql } from 'drizzle-orm';
import { check, foreignKey, index, jsonb, pgTable, text, timestamp, bigint, boolean, unique, uniqueIndex, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
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
    status: runStatus().notNull().default('trigger_requested'),
    // Legacy verdict is read-only pending a reviewed cleanup migration.
    verdict: runVerdict(),
    pendingCommand: text('pending_command').$type<'run' | 'pause' | 'resume' | 'cancel'>(),
    commandSequence: bigint('command_sequence', { mode: 'number' }),
    decision: text().$type<'accepted' | 'rejected'>(),
    commandReason: text('command_reason'),
    lastEventSequence: bigint('last_event_sequence', { mode: 'number' }).notNull().default(0),
    recoveryRequired: boolean('recovery_required').notNull().default(false),
    heartbeatEmittedAt: timestamp('heartbeat_emitted_at', { withTimezone: true }),
    heartbeatReceivedAt: timestamp('heartbeat_received_at', { withTimezone: true }),
    progress: jsonb(),
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
    check('run_command_enum', sql`${t.pendingCommand} IS NULL OR ${t.pendingCommand} IN ('run','pause','resume','cancel')`),
    check('run_decision_enum', sql`${t.decision} IS NULL OR ${t.decision} IN ('accepted','rejected')`),
    check('run_command_sequence_valid', sql`${t.commandSequence} IS NULL OR ${t.commandSequence} BETWEEN 1 AND 9007199254740991`),
    check('run_pending_command_identity', sql`${t.pendingCommand} IS NULL OR ${t.commandSequence} IS NOT NULL`),
    check('run_event_sequence_valid', sql`${t.lastEventSequence} BETWEEN 0 AND 9007199254740991`),
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
