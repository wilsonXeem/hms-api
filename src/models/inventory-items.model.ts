import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { facilities } from "./facilities.model";

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id").references(() => facilities.id),
  name: varchar("name", { length: 150 }).notNull(),
  category: varchar("category", { length: 100 }),
  unit: varchar("unit", { length: 50 }),
  minStockLevel: numeric("min_stock_level").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});
