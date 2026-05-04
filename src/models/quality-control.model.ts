import { pgTable, uuid, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { users } from './users.model';
import { facilities } from './facilities.model';

export const qualityControlChecks = pgTable("quality_control_checks", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id").references(() => facilities.id),
  checkType: varchar("check_type", { length: 50 }).notNull(), // lab_equipment, medication_storage, procedure_compliance
  checklistId: varchar("checklist_id", { length: 50 }),
  performedBy: uuid("performed_by").references(() => users.id),
  status: varchar("status", { length: 20 }).default("pending"), // pending, passed, failed, requires_action
  findings: text("findings"),
  correctiveActions: text("corrective_actions"),
  isCompliant: boolean("is_compliant").default(false),
  nextCheckDate: timestamp("next_check_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Backward compatibility export
export const qualityControl = qualityControlChecks;