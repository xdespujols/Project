import { pgTable, text, timestamp, uuid, date, jsonb, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { workspaces } from './workspaces';
import { epics } from './epics';
import { users } from './auth';

export const initiatives = pgTable('initiatives', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  sequenceId: integer('sequence_id').notNull().default(0),
  title: text('title').notNull(),
  description: jsonb('description'),
  descriptionText: text('description_text'),
  color: text('color').notNull().default('#8b5cf6'),
  startDate: date('start_date'),
  dueDate: date('due_date'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const initiativeEpics = pgTable('initiative_epics', {
  initiativeId: uuid('initiative_id')
    .notNull()
    .references(() => initiatives.id, { onDelete: 'cascade' }),
  epicId: uuid('epic_id')
    .notNull()
    .references(() => epics.id, { onDelete: 'cascade' }),
});
