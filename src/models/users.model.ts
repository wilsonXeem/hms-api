import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { facilities } from './facilities.model';

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id").references(() => facilities.id),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(), // admin, doctor, nurse, pharmacist, etc.
  phone: varchar("phone", { length: 50 }),
  department: varchar("department", { length: 100 }),
  isActive: boolean("is_active").default(true),
  preferences: jsonb("preferences").default('{}'),
  notificationSettings: jsonb("notification_settings").default('{}'),
  securitySettings: jsonb("security_settings").default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
