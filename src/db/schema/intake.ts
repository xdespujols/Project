import { pgTable, text, timestamp, uuid, jsonb, integer, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';
import { projects } from './projects';
import { issues } from './issues';

export const intakeStatusEnum = pgEnum('intake_status', [
  'pending',
  'accepted',
  'declined',
  'duplicate',
  'snoozed',
]);

export const intakeForms = pgTable('intake_forms', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  formToken: text('form_token').notNull().unique(), // public URL token
  title: text('title').notNull().default('Submit a request'),
  description: text('description'),
  isActive: integer('is_active').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const intakeSubmissions = pgTable('intake_submissions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  intakeFormId: uuid('intake_form_id')
    .notNull()
    .references(() => intakeForms.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  submitterEmail: text('submitter_email'),
  submitterName: text('submitter_name'),
  status: intakeStatusEnum('status').notNull().default('pending'),
  convertedIssueId: uuid('converted_issue_id').references(() => issues.id),
  triageNote: text('triage_note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
