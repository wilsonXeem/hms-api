import { pgTable, uuid, varchar, timestamp, text, jsonb, boolean } from 'drizzle-orm/pg-core';
import { facilities } from './facilities.model';
import { users } from './users.model';

export const resultTemplates = pgTable('result_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  facilityId: uuid('facility_id').references(() => facilities.id).notNull(),
  templateName: varchar('template_name', { length: 100 }).notNull(),
  testType: varchar('test_type', { length: 100 }).notNull(),
  fields: jsonb('fields').notNull(),
  isActive: boolean('is_active').default(true),
  version: varchar('version', { length: 10 }).default('1.0'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});