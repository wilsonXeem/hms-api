import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { users } from './users.model';

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  module: varchar("module", { length: 100 }),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: varchar("entity_id", { length: 150 }),
  action: varchar("action", { length: 150 }),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});
