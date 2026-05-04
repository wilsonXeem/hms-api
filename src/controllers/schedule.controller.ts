import { Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../config/db.config';
import { doctorSchedules } from '../models/doctor-schedules.model';
import { users } from '../models/users.model';
import { successResponse, errorResponse } from '../utils/response.util';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// GET /api/schedules — all doctor schedules for the facility
export const getSchedules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;

    const rows = await db.select({
      id: doctorSchedules.id,
      doctorId: doctorSchedules.doctorId,
      dayOfWeek: doctorSchedules.dayOfWeek,
      startTime: doctorSchedules.startTime,
      endTime: doctorSchedules.endTime,
      slotDurationMinutes: doctorSchedules.slotDurationMinutes,
      isActive: doctorSchedules.isActive,
      doctorFirstName: users.firstName,
      doctorLastName: users.lastName,
      department: users.department
    })
    .from(doctorSchedules)
    .innerJoin(users, eq(doctorSchedules.doctorId, users.id))
    .where(eq(doctorSchedules.facilityId, facilityId));

    const schedules = rows.map(r => ({
      ...r,
      dayName: DAYS[r.dayOfWeek ?? 0]
    }));

    successResponse(res, 'Schedules retrieved', { schedules });
  } catch (error) { next(error); }
};

// GET /api/schedules/doctors — doctors list for schedule management
export const getDoctorsForSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const doctors = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      department: users.department
    }).from(users).where(and(eq(users.facilityId, facilityId), eq(users.role, 'doctor'), eq(users.isActive, true)));
    successResponse(res, 'Doctors retrieved', { doctors });
  } catch (error) { next(error); }
};

// GET /api/schedules/:doctorId — schedule for a specific doctor
export const getDoctorSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { doctorId } = req.params;

    const rows = await db.select().from(doctorSchedules)
      .where(and(eq(doctorSchedules.facilityId, facilityId), eq(doctorSchedules.doctorId, doctorId)));

    const schedule = rows.map(r => ({ ...r, dayName: DAYS[r.dayOfWeek ?? 0] }));
    successResponse(res, 'Doctor schedule retrieved', { schedule });
  } catch (error) { next(error); }
};

// POST /api/schedules — add a schedule slot
export const createSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { doctorId, dayOfWeek, startTime, endTime, slotDurationMinutes } = req.body;

    if (!doctorId || dayOfWeek === undefined || !startTime || !endTime) {
      return errorResponse(res, 'doctorId, dayOfWeek, startTime and endTime are required', undefined, 400);
    }

    // check for duplicate
    const existing = await db.select().from(doctorSchedules)
      .where(and(
        eq(doctorSchedules.facilityId, facilityId),
        eq(doctorSchedules.doctorId, doctorId),
        eq(doctorSchedules.dayOfWeek, dayOfWeek)
      )).limit(1);

    if (existing.length > 0) {
      return errorResponse(res, 'Schedule already exists for this doctor on this day. Update it instead.', undefined, 409);
    }

    const [created] = await db.insert(doctorSchedules).values({
      facilityId,
      doctorId,
      dayOfWeek,
      startTime,
      endTime,
      slotDurationMinutes: slotDurationMinutes || 30,
      isActive: true
    } as any).returning();

    successResponse(res, 'Schedule created', { schedule: { ...created, dayName: DAYS[dayOfWeek] } }, 201);
  } catch (error) { next(error); }
};

// PUT /api/schedules/:id — update a schedule slot
export const updateSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, slotDurationMinutes, isActive } = req.body;

    const [updated] = await db.update(doctorSchedules)
      .set({ startTime, endTime, slotDurationMinutes, isActive } as any)
      .where(eq(doctorSchedules.id, id))
      .returning();

    if (!updated) return errorResponse(res, 'Schedule not found', undefined, 404);
    successResponse(res, 'Schedule updated', { schedule: { ...updated, dayName: DAYS[updated.dayOfWeek ?? 0] } });
  } catch (error) { next(error); }
};

// DELETE /api/schedules/:id — remove a schedule slot
export const deleteSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const [deleted] = await db.delete(doctorSchedules).where(eq(doctorSchedules.id, id)).returning();
    if (!deleted) return errorResponse(res, 'Schedule not found', undefined, 404);
    successResponse(res, 'Schedule deleted');
  } catch (error) { next(error); }
};

// PATCH /api/schedules/:id/toggle — toggle active/inactive
export const toggleSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const [current] = await db.select().from(doctorSchedules).where(eq(doctorSchedules.id, id)).limit(1);
    if (!current) return errorResponse(res, 'Schedule not found', undefined, 404);

    const [updated] = await db.update(doctorSchedules)
      .set({ isActive: !current.isActive } as any)
      .where(eq(doctorSchedules.id, id))
      .returning();

    successResponse(res, `Schedule ${updated.isActive ? 'activated' : 'deactivated'}`, { schedule: updated });
  } catch (error) { next(error); }
};
