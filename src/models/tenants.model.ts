import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const ORGANIZATION_TYPES = {
  HOSPITAL: 'hospital',
  CLINIC: 'clinic', 
  PHARMACY: 'pharmacy',
  WAREHOUSE: 'warehouse',
  DIAGNOSTIC_CENTER: 'diagnostic_center'
} as const;

export type OrganizationType = typeof ORGANIZATION_TYPES[keyof typeof ORGANIZATION_TYPES];

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  organizationType: varchar("organization_type", { length: 50 }).notNull(), // hospital, clinic, pharmacy, warehouse, diagnostic_center
  subdomain: varchar("subdomain", { length: 50 }).unique().notNull(), // client1.yourdomain.com
  customDomain: varchar("custom_domain", { length: 100 }), // client.com
  subscriptionPlan: varchar("subscription_plan", { length: 50 }).notNull(), // basic, premium, enterprise
  maxFacilities: integer("max_facilities").default(1),
  maxUsers: integer("max_users").default(50),
  allowedModules: text("allowed_modules"), // JSON: ["pharmacy","lab","inventory"]
  billingEmail: varchar("billing_email", { length: 150 }),
  isActive: boolean("is_active").default(true),
  setupCompleted: boolean("setup_completed").default(false),
  facilitySettings: jsonb("facility_settings").default('{}'),
  systemSettings: jsonb("system_settings").default('{}'),
  trialEndsAt: timestamp("trial_ends_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
