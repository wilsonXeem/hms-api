import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { facilities } from './facilities.model';
import { admissions } from './admissions.model';
import { beds } from './beds.model';
import { wards } from './wards.model';

export const roomCharges = pgTable("room_charges", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id").references(() => facilities.id),
  admissionId: uuid("admission_id").references(() => admissions.id),
  bedId: uuid("bed_id").references(() => beds.id),
  wardId: uuid("ward_id").references(() => wards.id),
  chargeDate: timestamp("charge_date").defaultNow(),
  dailyRate: numeric("daily_rate", { precision: 10, scale: 2 }).notNull(),
  numberOfDays: numeric("number_of_days", { precision: 5, scale: 2 }).default("1.00"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  chargeType: varchar("charge_type", { length: 50 }).default("room"), // room, bed, ward
  status: varchar("status", { length: 20 }).default("pending"), // pending, billed, paid
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});