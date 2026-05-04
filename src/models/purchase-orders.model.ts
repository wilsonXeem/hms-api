import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  text,
  jsonb,
} from "drizzle-orm/pg-core";
import { facilities } from "./facilities.model";
import { users } from "./users.model";

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id").references(() => facilities.id),
  orderNumber: varchar("order_number", { length: 100 }).notNull(),
  supplier: varchar("supplier", { length: 150 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending"), // pending, approved, ordered, received, cancelled
  totalAmount: numeric("total_amount").default("0"),
  items: jsonb("items").notNull(), // Array of {itemId, itemName, quantity, unitPrice}
  notes: text("notes"),
  requestedBy: uuid("requested_by").references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  orderDate: timestamp("order_date"),
  expectedDelivery: timestamp("expected_delivery"),
  receivedDate: timestamp("received_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});