import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  text,
} from "drizzle-orm/pg-core";
import { facilities } from './facilities.model';
import { users } from './users.model';

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id").references(() => facilities.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  permissions: jsonb("permissions").default('[]'), // Array of permission strings
  isSystem: boolean("is_system").default(false), // System roles cannot be deleted
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  roleId: uuid("role_id").references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: uuid("assigned_by").references(() => users.id),
});