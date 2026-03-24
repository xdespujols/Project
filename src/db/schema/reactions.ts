import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';
import { issueComments } from './issues';

export const commentReactions = pgTable('comment_reactions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  commentId: uuid('comment_id')
    .notNull()
    .references(() => issueComments.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  emoji: text('emoji').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
