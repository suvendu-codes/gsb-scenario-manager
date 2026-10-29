import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { runEngine } from './enums.js';
import { run } from './run.js';
import { scenario } from './scenario.js';

/**
 * Transactional outbox for SM → engine commands.
 *
 * The trigger API builds the complete wire event and inserts it here in the same
 * transaction that creates the run. The outbox worker only delivers `payload` as-is,
 * so a retry always re-sends byte-identical content with the same (correlation_id, sequence).
 */
export const runOutbox = pgTable(
  'run_outbox',
  {
    id: uuid().primaryKey().defaultRandom(),
    scenarioId: uuid('scenario_id')
      .notNull()
      .references(() => scenario.id),
    runId: uuid('run_id')
      .notNull()
      .references(() => run.id),
    correlationId: text('correlation_id').notNull(),
    engine: runEngine().notNull(),
    eventType: text('event_type').notNull(),
    commandId: text('command_id').$type<'run' | 'pause' | 'resume' | 'cancel'>().notNull(),
    /** SM command sequence (independent from the engine response counter). */
    sequence: integer().notNull(),
    topic: text().notNull(),
    messageKey: text('message_key').notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    headers: jsonb().$type<Record<string, string>>().notNull().default({}),
    status: text().$type<'pending' | 'published' | 'dead'>().notNull().default('pending'),
    attempts: integer().notNull().default(0),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
    lockedBy: text('locked_by'),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (t) => [
    unique('run_outbox_correlation_sequence_key').on(t.correlationId, t.sequence),
    check('run_outbox_command_enum', sql`${t.commandId} IN ('run','pause','resume','cancel')`),
    check('run_outbox_status_enum', sql`${t.status} IN ('pending','published','dead')`),
    check('run_outbox_sequence_valid', sql`${t.sequence} > 0`),
    check('run_outbox_attempts_valid', sql`${t.attempts} >= 0`),
    check('run_outbox_published_consistent', sql`(${t.status} = 'published') = (${t.publishedAt} IS NOT NULL)`),
    index('run_outbox_due_idx').on(t.availableAt, t.createdAt).where(sql`${t.status} = 'pending'`),
    index('run_outbox_run_idx').on(t.runId),
  ],
);

export type RunOutboxRow = typeof runOutbox.$inferSelect;
