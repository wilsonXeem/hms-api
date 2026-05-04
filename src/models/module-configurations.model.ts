import {
  pgTable,
  uuid,
  varchar,
  boolean,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { facilities } from './facilities.model';

export const moduleConfigurations = pgTable("module_configurations", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id").references(() => facilities.id),
  moduleName: varchar("module_name", { length: 50 }).notNull(), // "pharmacy", "lab", "inventory", "patients", "doctors"
  isEnabled: boolean("is_enabled").default(false),
  configuration: text("configuration"), // JSON config per module
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});