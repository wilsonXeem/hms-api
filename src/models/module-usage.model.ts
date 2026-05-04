import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.model';
import { facilities } from './facilities.model';

export const moduleUsage = pgTable('module_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  facilityId: uuid('facility_id').references(() => facilities.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
  moduleName: varchar('module_name', { length: 100 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  sessionDuration: integer('session_duration'),
  timestamp: timestamp('timestamp').defaultNow()
});