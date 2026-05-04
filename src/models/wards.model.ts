import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { facilities } from './facilities.model';

export const wards = pgTable("wards", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id").references(() => facilities.id),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull(),
  department: varchar("department", { length: 100 }),
  floor: integer("floor"),
  totalBeds: integer("total_beds").default(0),
  availableBeds: integer("available_beds").default(0),
  wardType: varchar("ward_type", { length: 50 }).default("general"), // general, icu, emergency, maternity
  isActive: boolean("is_active").default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});