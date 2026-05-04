import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const modulePackages = pgTable("module_packages", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // "Hospital Starter", "Pharmacy Pro"
  description: text("description"),
  targetOrgTypes: text("target_org_types"), // JSON: ["hospital", "clinic"]
  includedModules: text("included_modules"), // JSON: ["patients", "doctors", "pharmacy"]
  packagePrice: decimal("package_price", { precision: 10, scale: 2 }),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const PREDEFINED_PACKAGES = {
  HOSPITAL_COMPLETE: {
    name: "Hospital Complete",
    modules: ["patients", "doctors", "pharmacy", "lab", "inventory", "billing", "reports"],
    targetTypes: ["hospital"]
  },
  CLINIC_ESSENTIAL: {
    name: "Clinic Essential", 
    modules: ["patients", "doctors", "billing"],
    targetTypes: ["clinic"]
  },
  PHARMACY_PRO: {
    name: "Pharmacy Pro",
    modules: ["pharmacy", "inventory", "patients", "billing"],
    targetTypes: ["pharmacy"]
  },
  WAREHOUSE_MANAGER: {
    name: "Warehouse Manager",
    modules: ["inventory", "suppliers", "logistics", "reports"],
    targetTypes: ["warehouse"]
  }
} as const;