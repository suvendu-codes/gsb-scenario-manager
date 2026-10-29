import { bigint, jsonb, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { run } from './run.js';
import type { OrderedRunEvent } from '../../status-worker/domain/run-event.js';

/** Durable receipt ledger: both applied events and events held behind a gap. */
export const runEventInbox = pgTable('run_event_inbox', {
  runId: uuid('run_id').notNull().references(() => run.id),
  sequence: bigint({ mode: 'number' }).notNull(),
  payload: jsonb().$type<OrderedRunEvent>().notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.runId, t.sequence] })]);
// TODO: agree retention/access controls before production. Do not delete receipts
// required for duplicate-payload verification or operator recovery.
