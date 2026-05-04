import {
  pgTable,
  uuid,
  varchar,
  decimal,
  timestamp,
  boolean,
  text,
} from "drizzle-orm/pg-core";
import { tenants } from './tenants.model';
import { moduleCatalog } from './module-catalog.model';

export const tenantSubscriptions = pgTable("tenant_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  moduleId: uuid("module_id").references(() => moduleCatalog.id),
  planName: varchar("plan_name", { length: 100 }),
  subscriptionType: varchar("subscription_type", { length: 20 }).notNull(), // "trial", "monthly", "yearly", "lifetime"
  status: varchar("status", { length: 30 }).default("active"),
  billingAmount: decimal("billing_amount", { precision: 10, scale: 2 }),
  price: decimal("price", { precision: 10, scale: 2 }),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  autoRenew: boolean("auto_renew").default(true),
  billingCycle: varchar("billing_cycle", { length: 20 }), // "monthly", "yearly"
  customConfiguration: text("custom_configuration"), // JSON for module-specific settings
  createdAt: timestamp("created_at").defaultNow(),
});
