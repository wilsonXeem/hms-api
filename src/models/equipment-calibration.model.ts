import { pgTable, uuid, varchar, timestamp, text, date } from 'drizzle-orm/pg-core';
import { facilities } from './facilities.model';
import { users } from './users.model';

export const equipmentCalibration = pgTable('equipment_calibration', {
  id: uuid('id').primaryKey().defaultRandom(),
  facilityId: uuid('facility_id').references(() => facilities.id).notNull(),
  equipmentName: varchar('equipment_name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }),
  serialNumber: varchar('serial_number', { length: 100 }),
  lastCalibrationDate: date('last_calibration_date'),
  nextCalibrationDate: date('next_calibration_date'),
  calibrationStatus: varchar('calibration_status', { length: 20 }).default('current'),
  performedBy: uuid('performed_by').references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});