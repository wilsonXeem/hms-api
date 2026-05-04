import { pgTable, uuid, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { prescriptionItems } from './prescription-items.model';
import { users } from './users.model';

export const prescriptionRefills = pgTable("prescription_refills", {
  id: uuid("id").defaultRandom().primaryKey(),
  prescriptionItemId: uuid("prescription_item_id").references(() => prescriptionItems.id),
  requestedBy: uuid("requested_by").references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  refillNumber: integer("refill_number").notNull(),
  quantityRequested: integer("quantity_requested").notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, denied, dispensed
  isAutoRefill: boolean("is_auto_refill").default(false),
  nextRefillDate: timestamp("next_refill_date"),
  createdAt: timestamp("created_at").defaultNow(),
});