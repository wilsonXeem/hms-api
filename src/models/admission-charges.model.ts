import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  text,
} from "drizzle-orm/pg-core";
import { admissions } from './admissions.model';
import { payments } from './payments.model';

export const admissionCharges = pgTable("admission_charges", {
  id: uuid("id").defaultRandom().primaryKey(),
  admissionId: uuid("admission_id").references(() => admissions.id, { onDelete: 'cascade' }).notNull(),
  chargeType: varchar("charge_type", { length: 50 }).notNull(), // room, procedure, medication, lab, consultation
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  quantity: numeric("quantity", { precision: 8, scale: 2 }).default("1"),
  paymentId: uuid("payment_id").references(() => payments.id),
  isPaid: varchar("is_paid", { length: 20 }).default("pending"), // pending, paid, partial
  createdAt: timestamp("created_at").defaultNow(),
});