import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { facilities } from './facilities.model';
import { wards } from './wards.model';
import { patients } from './patients.model';

export const beds = pgTable("beds", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id").references(() => facilities.id),
  wardId: uuid("ward_id").references(() => wards.id),
  bedNumber: varchar("bed_number", { length: 20 }).notNull(),
  bedType: varchar("bed_type", { length: 50 }).default("general"), // general, icu, isolation, private
  isOccupied: boolean("is_occupied").default(false),
  isActive: boolean("is_active").default(true),
  currentPatientId: uuid("current_patient_id").references(() => patients.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});