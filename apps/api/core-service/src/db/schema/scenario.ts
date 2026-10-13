import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { scenarioStatus } from './enums';

export const scenario = pgTable(
  'scenario',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    projectId: text('project_id').notNull(),
    mapId: text('map_id').notNull(),
    solutionId: text('solution_id'),
    status: scenarioStatus().notNull().default('draft'),
    config: jsonb().notNull().default({}),
    inboundUri: text('inbound_uri'),
    outboundUri: text('outbound_uri'),
    masterdataUri: text('masterdata_uri'),
    mockputUri: text('mockput_uri'),
    authorId: text('author_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('scenario_map_idx').on(t.projectId, t.mapId),
    uniqueIndex('scenario_map_name_unique').on(t.mapId, t.name),
    uniqueIndex('scenario_one_draft_per_map').on(t.projectId, t.mapId).where(sql`${t.status} = 'draft'`),
  ],
);
