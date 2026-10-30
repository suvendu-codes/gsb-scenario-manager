import { integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

export const mapBot = pgTable(
  'map_bot',
  {
    projectId: text('project_id').notNull(),
    mapId: text('map_id').notNull(),
    type: text().notNull(),
    name: text().notNull(),
    imageUrl: text('image_url').notNull().default(''),
    count: integer().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.mapId, t.type] })],
);
