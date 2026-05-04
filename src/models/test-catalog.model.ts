import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { facilities } from './facilities.model';

export const testCatalog = pgTable("test_catalog", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id").references(() => facilities.id),
  testName: varchar("test_name", { length: 100 }).notNull(),
  testCode: varchar("test_code", { length: 20 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // blood, urine, imaging, etc.
  description: text("description"),
  price: numeric("price").notNull(),
  normalRange: text("normal_range"),
  unit: varchar("unit", { length: 20 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});