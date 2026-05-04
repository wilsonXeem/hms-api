import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { patients } from './patients.model';
import { users } from './users.model';

export const vitals = pgTable("vitals", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").references(() => patients.id),
  recordedBy: uuid("recorded_by").references(() => users.id),
  bloodPressure: varchar("blood_pressure", { length: 20 }),
  temperature: numeric("temperature"),
  pulse: numeric("pulse"),
  respiration: numeric("respiration"),
  weight: numeric("weight"),
  height: numeric("height"),
  recordedAt: timestamp("recorded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});
