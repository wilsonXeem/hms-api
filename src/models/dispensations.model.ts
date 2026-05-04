import {
  pgTable,
  uuid,
  varchar,
  numeric,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { prescriptionItems } from './prescription-items.model';
import { users } from './users.model';
import { inventoryBatches } from './inventory-batches.model';

export const dispensations = pgTable("dispensations", {
  id: uuid("id").defaultRandom().primaryKey(),
  prescriptionItemId: uuid("prescription_item_id").references(
    () => prescriptionItems.id
  ),
  pharmacistId: uuid("pharmacist_id").references(() => users.id),
  batchId: uuid("batch_id").references(() => inventoryBatches.id),
  quantityDispensed: numeric("quantity_dispensed").default("0"),
  patientCounseled: boolean("patient_counseled").default(false),
  remarks: varchar("remarks", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});
