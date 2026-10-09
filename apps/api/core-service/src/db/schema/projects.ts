import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull(),
  name: text().notNull(),
  mapId: uuid('map_id').notNull(),
  scenarioName: text('scenario_name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
