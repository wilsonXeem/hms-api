import { pgTable, uuid, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { patients } from './patients.model';
import { users } from './users.model';
import { admissions } from './admissions.model';
import { facilities } from './facilities.model';

export const consultations = pgTable("consultations", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id").references(() => facilities.id, { onDelete: 'cascade' }).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: 'cascade' }).notNull(),
  doctorId: uuid("doctor_id").references(() => users.id).notNull(),
  admissionId: uuid("admission_id").references(() => admissions.id, { onDelete: 'cascade' }), // For inpatient consultations
  consultationType: varchar("consultation_type", { length: 20 }).default("outpatient"), // inpatient, outpatient
  consultationDate: timestamp("consultation_date").defaultNow(),
  chiefComplaint: text("chief_complaint"),
  diagnosis: text("diagnosis"),
  notes: text("notes"),
  recommendedTests: text("recommended_tests"), // JSON array of test IDs
  followUpDate: timestamp("follow_up_date"),
  status: varchar("status", { length: 50 }).default("scheduled"), // scheduled, in_progress, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
