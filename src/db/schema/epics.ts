import { pgTable, text, timestamp, uuid, date, integer, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';
import { issues } from './issues';
import { users } from './auth';

export const epics = pgTable('epics', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sequenceId: integer('sequence_id').notNull().default(0),
  title: text('title').notNull(),
  description: jsonb('description'),
  descriptionText: text('description_text'),
  color: text('color').notNull().default('#6366f1'),
  startDate: date('start_date'),
  dueDate: date('due_date'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Issues can belong to one epic via epicId on the issues table — or via this join table
export const epicIssues = pgTable('epic_issues', {
  epicId: uuid('epic_id')
    .notNull()
    .references(() => epics.id, { onDelete: 'cascade' }),
  issueId: uuid('issue_id')
    .notNull()
    .references(() => issues.id, { onDelete: 'cascade' }),
});
