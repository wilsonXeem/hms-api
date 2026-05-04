import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  json,
} from "drizzle-orm/pg-core";
import { users } from './users.model';
import { facilities } from './facilities.model';

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id").references(() => facilities.id),
  userId: uuid("user_id").references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(), // appointment, lab_result, payment, inventory, system
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  data: json("data"), // Additional data for the notification
  isRead: boolean("is_read").default(false),
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
});