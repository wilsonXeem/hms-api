import { pgTable, uuid, varchar, numeric, timestamp, text } from "drizzle-orm/pg-core";
import { prescriptions } from "./prescriptions.model";
import { inventoryItems } from "./inventory-items.model";

export const prescriptionItems = pgTable("prescription_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  prescriptionId: uuid("prescription_id").references(() => prescriptions.id, { onDelete: 'cascade' }),
  drugName: varchar("drug_name", { length: 150 }).notNull(),
  drugId: uuid("drug_id").references(() => inventoryItems.id),
  dosage: varchar("dosage", { length: 100 }),
  frequency: varchar("frequency", { length: 100 }),
  duration: varchar("duration", { length: 100 }),
  quantityPrescribed: numeric("quantity_prescribed").default("0"),
  instructions: text("instructions"),
  createdAt: timestamp("created_at").defaultNow(),
});
