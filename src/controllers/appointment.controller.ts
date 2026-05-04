import { Request, Response, NextFunction } from 'express';
import { eq, and, desc, sql, ne } from 'drizzle-orm';
import { db } from '../config/db.config';
import { appointments } from '../models/appointments.model';
import { users } from '../models/users.model';
import { patients } from '../models/patients.model';
import { doctorSchedules } from '../models/doctor-schedules.model';
import { successResponse, errorResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';

export const getAutoAssignedDoctor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { date, time } = req.query as { date: string; time: string };

    if (!date || !time) {
      return errorResponse(res, 'date and time are required', undefined, 400);
    }

    // parse date as local to avoid UTC timezone shift
    const [year, month, day] = date.split('-').map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay();

    // find doctors scheduled on that day
    const scheduled = await db.select({
      doctorId: doctorSchedules.doctorId,
      startTime: doctorSchedules.startTime,
      endTime: doctorSchedules.endTime,
      slotDuration: doctorSchedules.slotDurationMinutes
    }).from(doctorSchedules)
      .where(and(
        eq(doctorSchedules.facilityId, facilityId),
        eq(doctorSchedules.dayOfWeek, dayOfWeek),
        eq(doctorSchedules.isActive, true),
        sql`${doctorSchedules.startTime} <= ${time}::time`,
        sql`${doctorSchedules.endTime} >= ${time}::time`
      ));

    if (scheduled.length === 0) {
      return successResponse(res, 'No doctor available for this slot', { doctor: null, available: false });
    }

    // pick doctor with fewest appointments on that date
    let assignedDoctor = null;
    let minLoad = Infinity;

    for (const sched of scheduled) {
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
        .from(appointments)
        .where(and(
          eq(appointments.doctorId, sched.doctorId!),
          sql`${appointments.appointmentDate} = ${date}`,
          ne(appointments.status, 'cancelled')
        ));

      if (count < minLoad) {
        minLoad = count;
        const [doctor] = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          department: users.department
        }).from(users).where(eq(users.id, sched.doctorId!)).limit(1);
        assignedDoctor = { ...doctor, appointmentsToday: count };
      }
    }

    successResponse(res, 'Doctor auto-assigned', { doctor: assignedDoctor, available: !!assignedDoctor });
  } catch (error) {
    next(error);
  }
};


export const getDoctorsList = async (req: Request, res: Response, next: NextFunction) => {
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

export const createAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { patientId, doctorId, appointmentDate, appointmentTime, reason, duration } = req.body;

    // look up patient name and phone to denormalize onto the appointment
    const [patient] = await db.select({
      firstName: patients.firstName,
      lastName: patients.lastName,
      phone: patients.phone,
      email: patients.email
    }).from(patients).where(eq(patients.id, patientId)).limit(1);

    const [appointment] = await db.insert(appointments).values({
      facilityId,
      patientId,
      doctorId,
      appointmentDate,
      appointmentTime,
      reason,
      duration: duration || '30 minutes',
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : null,
      phone: patient?.phone || null,
      email: patient?.email || null
    } as any).returning();

    logger.info(`Appointment created: ${appointment.id}`);
    successResponse(res, 'Appointment scheduled successfully', { appointment }, 201);
  } catch (error) {
    logger.error('Create appointment error:', error);
    next(error);
  }
};

export const getAppointments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { date, status, doctorId } = req.query;

    const appointmentList = await db.select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      patientName: appointments.patientName,
      phone: appointments.phone,
      email: appointments.email,
      appointmentDate: sql<string>`to_char(${appointments.appointmentDate}, 'YYYY-MM-DD')`,
      appointmentTime: appointments.appointmentTime,
      duration: appointments.duration,
      reason: appointments.reason,
      status: appointments.status,
      notes: appointments.notes,
      doctorFirstName: users.firstName,
      doctorLastName: users.lastName,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientPhone: patients.phone,
      createdAt: sql<string>`to_char(${appointments.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`
    })
    .from(appointments)
    .leftJoin(users, eq(appointments.doctorId, users.id))
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        eq(appointments.facilityId, facilityId),
        date     ? sql`to_char(${appointments.appointmentDate}, 'YYYY-MM-DD') = ${date}` : sql`1=1`,
        status   ? eq(appointments.status, status as string)                             : sql`1=1`,
        doctorId ? eq(appointments.doctorId, doctorId as string)                         : sql`1=1`
      )
    )
    .orderBy(desc(appointments.appointmentDate), appointments.appointmentTime);

    const result = appointmentList.map(a => ({
      ...a,
      patientName: a.patientName || (a.patientFirstName ? `${a.patientFirstName} ${a.patientLastName}` : '—'),
      phone:       a.phone || a.patientPhone || '—',
      doctorName:  a.doctorFirstName ? `${a.doctorFirstName} ${a.doctorLastName}` : '—'
    }));

    successResponse(res, 'Appointments retrieved successfully', { appointments: result });
  } catch (error) {
    logger.error('Get appointments error:', error);
    next(error);
  }
};

export const updateAppointmentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const [updated] = await db.update(appointments)
      .set({ status, notes, updatedAt: new Date() } as any)
      .where(eq(appointments.id, id))
      .returning();

    if (!updated) {
      return errorResponse(res, 'Appointment not found', undefined, 404);
    }

    successResponse(res, 'Appointment updated successfully', { appointment: updated });
  } catch (error) {
    logger.error('Update appointment error:', error);
    next(error);
  }
};

export const getDoctorAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { doctorId, date } = req.params;

    const bookedSlots = await db.select({
      time: appointments.appointmentTime
    })
    .from(appointments)
    .where(and(
      eq(appointments.doctorId, doctorId),
      eq(appointments.status, 'scheduled')
    ) as any);

    const workingHours = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
    const bookedTimes = bookedSlots.map(slot => slot.time);
    const availableSlots = workingHours.filter(time => !bookedTimes.includes(time));

    successResponse(res, 'Availability retrieved', { availableSlots, bookedSlots: bookedTimes });
  } catch (error) {
    logger.error('Get availability error:', error);
    next(error);
  }
};

export const rescheduleAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { appointmentDate, appointmentTime, reason } = req.body;

    const [updated] = await db.update(appointments)
      .set({ 
        appointmentDate, 
        appointmentTime, 
        notes: reason,
        updatedAt: new Date() 
      } as any)
      .where(eq(appointments.id, id))
      .returning();

    if (!updated) {
      return errorResponse(res, 'Appointment not found', undefined, 404);
    }

    successResponse(res, 'Appointment rescheduled successfully', { appointment: updated });
  } catch (error) {
    logger.error('Reschedule appointment error:', error);
    next(error);
  }
};

export const cancelAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [cancelled] = await db.update(appointments)
      .set({ 
        status: 'cancelled', 
        notes: reason,
        updatedAt: new Date() 
      } as any)
      .where(eq(appointments.id, id))
      .returning();

    if (!cancelled) {
      return errorResponse(res, 'Appointment not found', undefined, 404);
    }

    successResponse(res, 'Appointment cancelled successfully', { appointment: cancelled });
  } catch (error) {
    logger.error('Cancel appointment error:', error);
    next(error);
  }
};

export const getUpcomingAppointments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const today = new Date().toISOString().split('T')[0];
    
    const upcomingAppointments = await db.select()
      .from(appointments)
      .where(and(
        eq(appointments.facilityId, facilityId),
        eq(appointments.status, 'scheduled')
      ) as any);

    successResponse(res, 'Upcoming appointments retrieved', { appointments: upcomingAppointments });
  } catch (error) {
    logger.error('Get upcoming appointments error:', error);
    next(error);
  }
};

export const sendAppointmentReminders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    
    const appointmentsToRemind = await db.select()
      .from(appointments)
      .where(and(
        eq(appointments.facilityId, facilityId),
        eq(appointments.status, 'scheduled')
      ) as any);

    logger.info(`Sending reminders for ${appointmentsToRemind.length} appointments`);
    successResponse(res, 'Reminders sent successfully', { count: appointmentsToRemind.length });
  } catch (error) {
    logger.error('Send reminders error:', error);
    next(error);
  }
};

export const createRecurringAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { patientId, doctorId, startDate, endDate, frequency, appointmentTime, reason } = req.body;

    const recurringAppointments = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = start; date <= end; date.setDate(date.getDate() + (frequency === 'weekly' ? 7 : 1))) {
      const [appointment] = await db.insert(appointments).values({
        facilityId,
        patientId,
        doctorId,
        appointmentDate: date.toISOString().split('T')[0],
        appointmentTime,
        reason,
        duration: '30 minutes'
      } as any).returning();
      
      recurringAppointments.push(appointment);
    }

    successResponse(res, 'Recurring appointments created', { appointments: recurringAppointments }, 201);
  } catch (error) {
    logger.error('Create recurring appointment error:', error);
    next(error);
  }
};

export const getAppointmentSlots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { doctorId, date } = req.query;
    
    const bookedSlots = await db.select({
      time: appointments.appointmentTime
    })
    .from(appointments)
    .where(and(
      eq(appointments.doctorId, doctorId as string),
      eq(appointments.status, 'scheduled')
    ) as any);

    const workingHours = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
    const bookedTimes = bookedSlots.map(slot => slot.time);
    const availableSlots = workingHours.filter(time => !bookedTimes.includes(time));

    successResponse(res, 'Appointment slots retrieved', { availableSlots, bookedSlots: bookedTimes });
  } catch (error) {
    logger.error('Get appointment slots error:', error);
    next(error);
  }
};

export const bulkUpdateAppointments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appointmentIds, updates } = req.body;
    
    const updatedAppointments = [];
    for (const id of appointmentIds) {
      const [updated] = await db.update(appointments)
        .set({ ...updates, updatedAt: new Date() } as any)
        .where(eq(appointments.id, id))
        .returning();
      
      if (updated) updatedAppointments.push(updated);
    }

    successResponse(res, 'Appointments updated successfully', { appointments: updatedAppointments });
  } catch (error) {
    logger.error('Bulk update appointments error:', error);
    next(error);
  }
};