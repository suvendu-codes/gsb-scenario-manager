import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { scenarioStatus } from './enums';

export const scenario = pgTable(
  'scenario',
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: text('project_id').notNull(),
    mapId: text('map_id').notNull(),
    name: text().notNull(),
    status: scenarioStatus().notNull().default('draft'),
    authorId: text('author_id').notNull(),
    currentVersion: integer('current_version').notNull().default(1),
    version: integer().notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('scenario_map_idx').on(t.projectId, t.mapId),
    uniqueIndex('scenario_map_name_unique').on(t.mapId, t.name),
  ],
);
