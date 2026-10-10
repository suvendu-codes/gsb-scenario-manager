import { integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { scenario } from './scenario';

export const scenarioVersion = pgTable(
  'scenario_version',
  {
    id: uuid().primaryKey().defaultRandom(),
    scenarioId: uuid('scenario_id')
      .notNull()
      .references(() => scenario.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),    
    configUri: text('config_uri').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.scenarioId, t.versionNumber)],
);
