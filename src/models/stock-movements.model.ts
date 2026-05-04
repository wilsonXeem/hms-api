import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  text,
} from "drizzle-orm/pg-core";
import { inventoryItems } from "./inventory-items.model";
import { inventoryBatches } from "./inventory-batches.model";
import { users } from "./users.model";

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id").references(() => inventoryItems.id),
  batchId: uuid("batch_id").references(() => inventoryBatches.id),
  movementType: varchar("movement_type", { length: 50 }).notNull(), // in, out, adjustment, transfer, disposal
  quantity: numeric("quantity").notNull(),
  previousQuantity: numeric("previous_quantity"),
  newQuantity: numeric("new_quantity"),
  reason: varchar("reason", { length: 100 }),
  notes: text("notes"),
  performedBy: uuid("performed_by").references(() => users.id),
  referenceId: uuid("reference_id"), // Reference to prescription, dispensation, etc.
  referenceType: varchar("reference_type", { length: 50 }), // prescription, dispensation, adjustment, etc.
  createdAt: timestamp("created_at").defaultNow(),
});