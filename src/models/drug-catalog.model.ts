import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

export const drugCatalog = pgTable("drug_catalog", {
  id: uuid("id").defaultRandom().primaryKey(),
  genericName: varchar("generic_name", { length: 200 }).notNull(),
  brandName: varchar("brand_name", { length: 200 }),
  category: varchar("category", { length: 100 }).notNull(),
  dosageForm: varchar("dosage_form", { length: 50 }), // tablet, capsule, injection, etc.
  strength: varchar("strength", { length: 100 }), // 500mg, 10mg/ml, etc.
  minDose: numeric("min_dose"),
  maxDose: numeric("max_dose"),
  doseUnit: varchar("dose_unit", { length: 20 }), // mg, ml, units
  contraindications: jsonb("contraindications"), // array of conditions
  interactions: jsonb("interactions"), // array of drug interactions
  sideEffects: jsonb("side_effects"), // array of side effects
  pregnancyCategory: varchar("pregnancy_category", { length: 5 }), // A, B, C, D, X
  isControlled: boolean("is_controlled").default(false),
  controlledSchedule: varchar("controlled_schedule", { length: 10 }), // I, II, III, IV, V
  allergens: jsonb("allergens"), // array of potential allergens
  warnings: text("warnings"),
  isActive: boolean("is_active").default(true),
});