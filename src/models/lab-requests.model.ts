import { pgTable, uuid, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { consultations } from './consultations.model';
import { patients } from './patients.model';
import { users } from './users.model';
import { facilities } from './facilities.model';

export const labRequests = pgTable("lab_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  consultationId: uuid("consultation_id").references(() => consultations.id),
  patientId: uuid("patient_id").references(() => patients.id),
  testName: varchar("test_name", { length: 100 }).notNull(),
  requestedBy: uuid("requested_by").references(() => users.id),
  assignedLabId: uuid("assigned_lab_id").references(() => facilities.id),
  priority: varchar("priority", { length: 20 }).default("routine"),
  status: varchar("status", { length: 50 }).default("pending"),
  sampleCollected: boolean("sample_collected").default(false),
  sampleCollectedAt: timestamp("sample_collected_at"),
  sampleType: varchar("sample_type", { length: 50 }),
  sampleNotes: text("sample_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});
