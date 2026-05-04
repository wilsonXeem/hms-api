import { pgTable, uuid, varchar, timestamp, text, jsonb } from 'drizzle-orm/pg-core';
import { facilities } from './facilities.model';
import { patients } from './patients.model';
import { labRequests } from './lab-requests.model';

export const sampleTracking = pgTable('sample_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  facilityId: uuid('facility_id').references(() => facilities.id).notNull(),
  patientId: uuid('patient_id').references(() => patients.id).notNull(),
  requestId: uuid('request_id').references(() => labRequests.id),
  barcode: varchar('barcode', { length: 50 }).unique().notNull(),
  sampleType: varchar('sample_type', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).default('collected').notNull(),
  currentLocation: varchar('current_location', { length: 100 }),
  collectedAt: timestamp('collected_at').defaultNow(),
  trackingEvents: jsonb('tracking_events').default([]),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});