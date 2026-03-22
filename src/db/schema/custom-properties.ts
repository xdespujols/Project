import { pgTable, text, timestamp, uuid, jsonb, boolean, pgEnum, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';
import { issues } from './issues';

export const propertyTypeEnum = pgEnum('property_type', [
  'text',
  'number',
  'checkbox',
  'date',
  'select',
  'multi_select',
  'url',
  'email',
  'member',
]);

export const customProperties = pgTable('custom_properties', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: propertyTypeEnum('type').notNull().default('text'),
  // For select/multi_select: array of { id, name, color } objects
  options: jsonb('options'),
  isRequired: boolean('is_required').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const issuePropertyValues = pgTable('issue_property_values', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  issueId: uuid('issue_id')
    .notNull()
    .references(() => issues.id, { onDelete: 'cascade' }),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => customProperties.id, { onDelete: 'cascade' }),
  // Stored as JSONB to handle any type: string | number | boolean | string[] | null
  value: jsonb('value'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
