import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  text,
} from "drizzle-orm/pg-core";
import { patients } from './patients.model';
import { users } from './users.model';
import { admissions } from './admissions.model';
import { facilities } from './facilities.model';

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id").references(() => facilities.id),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: 'cascade' }).notNull(),
  admissionId: uuid("admission_id").references(() => admissions.id, { onDelete: 'cascade' }),
  department: varchar("department", { length: 100 }),
  referenceCode: varchar("reference_code", { length: 100 }).unique().notNull(),
  amount: numeric("amount").notNull(),
  method: varchar("method", { length: 20 }).notNull(), // cash, transfer
  status: varchar("status", { length: 20 }).default("pending"),
  transactionId: varchar("transaction_id", { length: 100 }),
  approvedBy: uuid("approved_by").references(() => users.id),
  refundAmount: numeric("refund_amount"),
  refundReason: text("refund_reason"),
  refundedBy: uuid("refunded_by").references(() => users.id),
  refundedAt: timestamp("refunded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
