import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  json
} from "drizzle-orm/pg-core";
import { tenants } from './tenants.model';

export const facilities = pgTable("facilities", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  name: varchar("name", { length: 150 }).notNull(),
  type: varchar("type", { length: 50 }), // hospital, clinic, diagnostic_center, pharmacy, warehouse
  address: varchar("address", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 150 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  description: text("description"),
  mission: text("mission"),
  vision: text("vision"),
  services: json("services"),
  departments: json("departments"),
  operatingHours: json("operating_hours"),
  emergencyContact: varchar("emergency_contact", { length: 50 }),
  website: varchar("website", { length: 255 }),
  aboutContent: text("about_content"),
  servicesOffered: json("services_offered"),
  logoUrl: varchar("logo_url", { length: 255 }),
  socialMediaLinks: json("social_media_links"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
