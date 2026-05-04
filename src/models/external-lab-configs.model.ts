import { pgTable, uuid, varchar, timestamp, text, jsonb, boolean } from 'drizzle-orm/pg-core';
import { facilities } from './facilities.model';

export const externalLabConfigs = pgTable('external_lab_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  facilityId: uuid('facility_id').references(() => facilities.id).notNull(),
  labName: varchar('lab_name', { length: 100 }).notNull(),
  apiEndpoint: varchar('api_endpoint', { length: 255 }).notNull(),
  integrationType: varchar('integration_type', { length: 20 }).notNull(), // hl7, rest, soap
  credentials: jsonb('credentials'),
  isActive: boolean('is_active').default(true),
  connectionStatus: varchar('connection_status', { length: 20 }).default('disconnected'),
  lastSyncTime: timestamp('last_sync_time'),
  autoSync: boolean('auto_sync').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});