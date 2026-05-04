import { pgTable, uuid, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { labRequests } from './lab-requests.model';
import { patients } from './patients.model';
import { users } from './users.model';

export const labResults = pgTable("lab_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").references(() => labRequests.id, { onDelete: 'cascade' }).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: 'cascade' }).notNull(),
  resultText: text("result_text"),
  resultFileUrl: varchar("result_file_url", { length: 255 }),
  resultValue: varchar("result_value", { length: 100 }),
  unit: varchar("unit", { length: 20 }),
  validationStatus: varchar("validation_status", { length: 20 }).default("normal"), // normal, abnormal, critical
  isCritical: boolean("is_critical").default(false),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});
