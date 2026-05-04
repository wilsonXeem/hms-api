import {
  pgTable,
  uuid,
  varchar,
  numeric,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { inventoryItems } from "./inventory-items.model";

export const inventoryBatches = pgTable("inventory_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id").references(() => inventoryItems.id),
  batchNumber: varchar("batch_number", { length: 100 }).notNull(),
  quantity: numeric("quantity").default("0"),
  expiryDate: date("expiry_date").notNull(),
  receivedDate: date("received_date").defaultNow(),
  supplier: varchar("supplier", { length: 150 }),
  costPrice: numeric("cost_price"),
  sellingPrice: numeric("selling_price"),
  createdAt: timestamp("created_at").defaultNow(),
});
