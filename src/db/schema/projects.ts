import { pgTable, text, timestamp, uuid, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';
import { workspaces, workspaceRoleEnum } from './workspaces';

export type ProjectFeatures = {
  cycles?: boolean;
  modules?: boolean;
  views?: boolean;
  pages?: boolean;
  intake?: boolean;
};

export const projectNetworkEnum = pgEnum('project_network', [
  'public',
  'private',
]);

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  identifier: text('identifier').notNull(), // e.g. "PLN"
  description: text('description'),
  logo: text('logo'),
  network: projectNetworkEnum('network').notNull().default('public'),
  features: jsonb('features').$type<ProjectFeatures>().default({
    cycles: true,
    modules: true,
    views: true,
    pages: true,
    intake: false,
  }),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projectMembers = pgTable('project_members', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: workspaceRoleEnum('role').notNull().default('member'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});
