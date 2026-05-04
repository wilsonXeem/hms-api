import { pgTable, uuid, varchar, integer, timestamp, text } from "drizzle-orm/pg-core";
import { inventoryItems } from './inventory-items.model';
import { users } from './users.model';
import { dispensations } from './dispensations.model';

export const controlledSubstances = pgTable("controlled_substances", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id").references(() => inventoryItems.id),
  scheduleClass: varchar("schedule_class", { length: 10 }).notNull(), // I, II, III, IV, V
  deaNumber: varchar("dea_number", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const controlledSubstanceLog = pgTable("controlled_substance_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  controlledSubstanceId: uuid("controlled_substance_id").references(() => controlledSubstances.id),
  dispensationId: uuid("dispensation_id").references(() => dispensations.id),
  action: varchar("action", { length: 20 }).notNull(), // dispensed, received, destroyed, transferred
  quantity: integer("quantity").notNull(),
  performedBy: uuid("performed_by").references(() => users.id),
  witnessedBy: uuid("witnessed_by").references(() => users.id),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});