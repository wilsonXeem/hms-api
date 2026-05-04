import { pgTable, uuid, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { consultations } from "./consultations.model";
import { users } from "./users.model";
import { patients } from "./patients.model";

export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  consultationId: uuid("consultation_id").references(() => consultations.id),
  patientId: uuid("patient_id").references(() => patients.id),
  doctorId: uuid("doctor_id").references(() => users.id),
  prescribedBy: uuid("prescribed_by").references(() => users.id),
  remarks: text("remarks"),
  status: varchar("status", { length: 50 }).default("pending"), // pending, dispensed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
