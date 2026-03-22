import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  date,
  jsonb,
  pgEnum,
  real,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { users } from './auth';
import { projects } from './projects';
import { states } from './issue-meta';

export const priorityEnum = pgEnum('issue_priority', [
  'none',
  'urgent',
  'high',
  'medium',
  'low',
]);

export const issues = pgTable('issues', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sequenceId: integer('sequence_id').notNull().default(0),
  title: text('title').notNull(),
  description: jsonb('description'), // TipTap JSON
  descriptionText: text('description_text'), // plain text for search
  stateId: uuid('state_id').references(() => states.id),
  priority: priorityEnum('priority').notNull().default('none'),
  parentId: uuid('parent_id'), // self-reference, set FK below
  sortOrder: integer('sort_order').notNull().default(0),
  startDate: date('start_date'),
  dueDate: date('due_date'),
  estimate: real('estimate'), // story points or hours
  completedAt: timestamp('completed_at'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const issueAssignees = pgTable('issue_assignees', {
  issueId: uuid('issue_id')
    .notNull()
    .references(() => issues.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const issueLabels = pgTable('issue_labels', {
  issueId: uuid('issue_id')
    .notNull()
    .references(() => issues.id, { onDelete: 'cascade' }),
  labelId: uuid('label_id')
    .notNull()
    .references(() => issues.id, { onDelete: 'cascade' }),
});

export const issueActivities = pgTable('issue_activities', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  issueId: uuid('issue_id')
    .notNull()
    .references(() => issues.id, { onDelete: 'cascade' }),
  actorId: text('actor_id').references(() => users.id),
  field: text('field').notNull(), // e.g. "state", "priority", "assignee"
  oldValue: text('old_value'),
  newValue: text('new_value'),
  oldIdentifier: text('old_identifier'),
  newIdentifier: text('new_identifier'),
  comment: text('comment'), // for comment activities
  epoch: integer('epoch'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const issueComments = pgTable('issue_comments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  issueId: uuid('issue_id')
    .notNull()
    .references(() => issues.id, { onDelete: 'cascade' }),
  actorId: text('actor_id').references(() => users.id),
  comment: jsonb('comment'), // TipTap JSON
  commentText: text('comment_text'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
