import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { patients } from "./patients.model";

export const patientAllergies = pgTable("patient_allergies", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  allergen: varchar("allergen", { length: 200 }).notNull(),
  allergenType: varchar("allergen_type", { length: 50 }).notNull(), // drug, food, environmental
  severity: varchar("severity", { length: 20 }).notNull(), // mild, moderate, severe, life-threatening
  reaction: text("reaction"), // description of allergic reaction
  onsetDate: timestamp("onset_date"),
  recordedBy: uuid("recorded_by"), // user who recorded the allergy
  createdAt: timestamp("created_at").defaultNow(),
});