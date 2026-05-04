import { pgTable, uuid, smallint, time, boolean, timestamp } from 'drizzle-orm/pg-core';
import { facilities } from './facilities.model';
import { users } from './users.model';

export const doctorSchedules = pgTable('doctor_schedules', {
  id:                   uuid('id').defaultRandom().primaryKey(),
  facilityId:           uuid('facility_id').references(() => facilities.id, { onDelete: 'cascade' }),
  doctorId:             uuid('doctor_id').references(() => users.id, { onDelete: 'cascade' }),
  dayOfWeek:            smallint('day_of_week').notNull(), // 0=Sun,1=Mon,...,6=Sat
  startTime:            time('start_time').notNull(),
  endTime:              time('end_time').notNull(),
  slotDurationMinutes:  smallint('slot_duration_minutes').default(30),
  isActive:             boolean('is_active').default(true),
  createdAt:            timestamp('created_at').defaultNow()
});
