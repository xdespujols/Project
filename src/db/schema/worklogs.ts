import { pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { issues } from './issues';
import { users } from './auth';

export const worklogs = pgTable('worklogs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  issueId: uuid('issue_id')
    .notNull()
    .references(() => issues.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id),
  // Duration in minutes
  duration: integer('duration').notNull(),
  description: text('description'),
  loggedAt: timestamp('logged_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
