import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { facilities } from './facilities.model';
import { patients } from './patients.model';
import { users } from './users.model';
import { beds } from './beds.model';
import { wards } from './wards.model';

export const admissions = pgTable("admissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id").references(() => facilities.id, { onDelete: 'cascade' }),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: 'cascade' }),
  admissionNumber: varchar("admission_number", { length: 50 }).unique().notNull(),
  admissionType: varchar("admission_type", { length: 50 }).notNull(), // inpatient, outpatient, emergency, day_care
  admissionDate: timestamp("admission_date").notNull(),
  dischargeDate: timestamp("discharge_date"),
  bedId: uuid("bed_id").references(() => beds.id),
  wardId: uuid("ward_id").references(() => wards.id),
  admittingDoctorId: uuid("admitting_doctor_id").references(() => users.id),
  dischargingDoctorId: uuid("discharging_doctor_id").references(() => users.id),
  status: varchar("status", { length: 20 }).default("admitted"), // admitted, discharged, transferred
  priority: varchar("priority", { length: 20 }).default("routine"), // routine, urgent, emergency
  admissionReason: text("admission_reason"),
  dischargeReason: text("discharge_reason"),
  dischargeSummary: text("discharge_summary"),
  totalCharges: numeric("total_charges", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});