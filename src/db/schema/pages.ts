import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';
import { projects } from './projects';

export const pages = pgTable('pages', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'), // self-reference for nesting
  title: text('title').notNull().default('Untitled'),
  content: jsonb('content'), // TipTap JSON
  contentText: text('content_text'), // plain text
  ownedBy: text('owned_by').references(() => users.id),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
