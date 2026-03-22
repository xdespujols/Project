import { pgTable, text, timestamp, uuid, date, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';
import { projects } from './projects';
import { issues } from './issues';

export const moduleStatusEnum = pgEnum('module_status', [
  'backlog',
  'in-progress',
  'paused',
  'completed',
  'cancelled',
]);

export const modules = pgTable('modules', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: moduleStatusEnum('status').notNull().default('backlog'),
  startDate: date('start_date'),
  targetDate: date('target_date'),
  leadId: text('lead_id').references(() => users.id),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const moduleIssues = pgTable('module_issues', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  moduleId: uuid('module_id')
    .notNull()
    .references(() => modules.id, { onDelete: 'cascade' }),
  issueId: uuid('issue_id')
    .notNull()
    .references(() => issues.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
