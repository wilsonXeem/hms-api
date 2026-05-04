import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  time,
  boolean
} from "drizzle-orm/pg-core";
import { patients } from './patients.model';
import { users } from './users.model';
import { facilities } from './facilities.model';

export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id").references(() => facilities.id),
  patientId: uuid("patient_id").references(() => patients.id),
  doctorId: uuid("doctor_id").references(() => users.id),
  appointmentDate: date("appointment_date").notNull(),
  appointmentTime: time("appointment_time").notNull(),
  duration: varchar("duration", { length: 20 }).default("30 minutes"),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).default("scheduled"), // scheduled, completed, cancelled, no_show
  notes: text("notes"),
  isPublicBooking: boolean("is_public_booking").default(false),
  patientName: varchar("patient_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});