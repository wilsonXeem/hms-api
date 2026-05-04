import {
  pgTable,
  uuid,
  varchar,
  boolean,
  text,
  decimal,
  timestamp,
} from "drizzle-orm/pg-core";

export const moduleCatalog = pgTable("module_catalog", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 50 }).unique().notNull(), // "pharmacy", "lab", "inventory"
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }), // "clinical", "administrative", "financial", "operational"
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
  dependencies: text("dependencies"), // JSON: ["patients"] - required modules
  compatibleOrgTypes: text("compatible_org_types"), // JSON: ["hospital", "clinic", "pharmacy", "warehouse"]
  features: text("features"), // JSON: detailed feature list
  limitations: text("limitations"), // JSON: usage limits per plan
  isStandalone: boolean("is_standalone").default(true),
  isActive: boolean("is_active").default(true),
  version: varchar("version", { length: 20 }).default("1.0.0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const MODULE_CATEGORIES = {
  CLINICAL: 'clinical',
  ADMINISTRATIVE: 'administrative', 
  FINANCIAL: 'financial',
  OPERATIONAL: 'operational',
  ANALYTICS: 'analytics'
} as const;