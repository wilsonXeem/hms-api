import { pgTable, uuid, varchar, integer, decimal, timestamp, date } from "drizzle-orm/pg-core";
import { facilities } from './facilities.model';

export const labAnalytics = pgTable("lab_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id").references(() => facilities.id),
  date: date("date").notNull(),
  totalTests: integer("total_tests").default(0),
  completedTests: integer("completed_tests").default(0),
  avgTurnaroundTime: decimal("avg_turnaround_time", { precision: 5, scale: 2 }),
  criticalResults: integer("critical_results").default(0),
  testCategory: varchar("test_category", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});