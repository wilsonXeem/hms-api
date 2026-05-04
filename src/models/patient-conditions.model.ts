import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { patients } from "./patients.model";

export const patientConditions = pgTable("patient_conditions", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  condition: varchar("condition", { length: 200 }).notNull(),
  icd10Code: varchar("icd10_code", { length: 20 }),
  isActive: boolean("is_active").default(true),
  diagnosedDate: timestamp("diagnosed_date"),
  notes: text("notes"),
  recordedBy: uuid("recorded_by"),
  createdAt: timestamp("created_at").defaultNow(),
});