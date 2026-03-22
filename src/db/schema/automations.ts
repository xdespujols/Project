import { pgTable, text, timestamp, uuid, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

export const triggerTypeEnum = pgEnum('automation_trigger_type', [
  'issue_created',
  'issue_state_changed',
  'issue_priority_changed',
  'issue_assignee_changed',
  'issue_due_date_passed',
  'issue_label_added',
]);

export const actionTypeEnum = pgEnum('automation_action_type', [
  'set_state',
  'set_priority',
  'add_label',
  'remove_label',
  'assign_to',
  'send_notification',
]);

export const automations = pgTable('automations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  isEnabled: boolean('is_enabled').notNull().default(true),
  triggerType: triggerTypeEnum('trigger_type').notNull(),
  // JSON conditions: e.g. { fromStateId: "...", toStateId: "..." }
  triggerConditions: jsonb('trigger_conditions'),
  actionType: actionTypeEnum('action_type').notNull(),
  // JSON payload: e.g. { stateId: "...", priority: "high", labelId: "..." }
  actionPayload: jsonb('action_payload'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const automationRuns = pgTable('automation_runs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  automationId: uuid('automation_id')
    .notNull()
    .references(() => automations.id, { onDelete: 'cascade' }),
  issueId: uuid('issue_id').notNull(),
  status: text('status').notNull().default('success'), // 'success' | 'failed'
  error: text('error'),
  ranAt: timestamp('ran_at').defaultNow().notNull(),
});
