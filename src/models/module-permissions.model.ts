import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.model';
import { moduleCatalog } from './module-catalog.model';

export const modulePermissions = pgTable('module_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  moduleId: uuid('module_id').references(() => moduleCatalog.id).notNull(),
  permission: varchar('permission', { length: 50 }).notNull(), // 'read', 'write', 'admin'
  granted: boolean('granted').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});