import { eq, and, gte, lte, between } from 'drizzle-orm';
import { db } from '../config/database';
import { appointments, users } from '../models/schema';
import { notificationService } from './notification.service';

export class AppointmentService {
  async createAppointment(appointmentData: any) {
    // Check for conflicts
    const conflicts = await this.checkTimeSlotConflict(
      appointmentData.doctorId,
      appointmentData.appointmentDate,
      appointmentData.appointmentTime
    );

    if (conflicts.length > 0) {
      throw new Error('Time slot conflict');
    }

    const [appointment] = await db.insert(appointments)
      .values({
        ...appointmentData,
        status: 'scheduled'
      })
      .returning();

    await notificationService.sendAppointmentConfirmation(appointment);
    return appointment;
  }

  async getAppointments(filters: any) {
    let query = db.select().from(appointments);
    
    if (filters.doctorId) {
      query = query.where(eq(appointments.doctorId, filters.doctorId));
    }
    if (filters.patientId) {
      query = query.where(eq(appointments.patientId, filters.patientId));
    }
    if (filters.date) {
      query = query.where(eq(appointments.appointmentDate, filters.date));
    }
    if (filters.status) {
      query = query.where(eq(appointments.status, filters.status));
    }

    return await query;
  }

  async updateAppointmentStatus(appointmentId: string, status: string, notes?: string) {
    const [appointment] = await db.update(appointments)
      .set({ status, notes })
      .where(eq(appointments.id, appointmentId))
      .returning();

    if (!appointment) throw new Error('Appointment not found');
    return appointment;
  }

  async getDoctorAvailability(doctorId: string, date: string) {
    const existingAppointments = await db.select()
      .from(appointments)
      .where(and(
        eq(appointments.doctorId, doctorId),
        eq(appointments.appointmentDate, date),
        eq(appointments.status, 'scheduled')
      ));

    // Generate available slots (9 AM to 5 PM, 30-minute slots)
    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const isBooked = existingAppointments.some(apt => apt.appointmentTime === timeSlot);
        
        if (!isBooked) {
          slots.push(timeSlot);
        }
      }
    }

    return slots;
  }

  async rescheduleAppointment(appointmentId: string, newDate: string, newTime: string, reason?: string) {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, appointmentId));
    if (!appointment) throw new Error('Appointment not found');

    // Check for conflicts at new time
    const conflicts = await this.checkTimeSlotConflict(appointment.doctorId, newDate, newTime);
    if (conflicts.length > 0) {
      throw new Error('New time slot conflict');
    }

    const [updated] = await db.update(appointments)
      .set({
        appointmentDate: newDate,
        appointmentTime: newTime,
        notes: reason
      })
      .where(eq(appointments.id, appointmentId))
      .returning();

    await notificationService.sendAppointmentRescheduled(updated);
    return updated;
  }

  async cancelAppointment(appointmentId: string, reason?: string) {
    const [appointment] = await db.update(appointments)
      .set({ 
        status: 'cancelled',
        notes: reason
      })
      .where(eq(appointments.id, appointmentId))
      .returning();

    if (!appointment) throw new Error('Appointment not found');
    await notificationService.sendAppointmentCancelled(appointment);
    return appointment;
  }

  async getUpcomingAppointments(userId: string, userRole: string) {
    const today = new Date().toISOString().split('T')[0];
    
    let query = db.select().from(appointments)
      .where(and(
        gte(appointments.appointmentDate, today),
        eq(appointments.status, 'scheduled')
      ));

    if (userRole === 'doctor') {
      query = query.where(eq(appointments.doctorId, userId));
    } else if (userRole === 'patient') {
      query = query.where(eq(appointments.patientId, userId));
    }

    return await query;
  }

  async sendAppointmentReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const appointmentRows = await db.select()
      .from(appointments)
      .where(and(
        eq(appointments.appointmentDate, tomorrowStr),
        eq(appointments.status, 'scheduled')
      ));

    for (const appointment of appointmentRows) {
      await notificationService.sendAppointmentReminder(appointment);
    }

    return { sent: appointmentRows.length };
  }

  async createRecurringAppointment(appointmentData: any, recurrencePattern: any) {
    const recurringAppointments = [];
    const { frequency, endDate, occurrences } = recurrencePattern;
    
    let currentDate = new Date(appointmentData.appointmentDate);
    let count = 0;

    while (count < occurrences && currentDate <= new Date(endDate)) {
      const appointment = await this.createAppointment({
        ...appointmentData,
        appointmentDate: currentDate.toISOString().split('T')[0]
      });
      
      recurringAppointments.push(appointment);
      
      // Increment date based on frequency
      if (frequency === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (frequency === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      
      count++;
    }

    return recurringAppointments;
  }

  async getAppointmentSlots(doctorId: string, date: string) {
    return await this.getDoctorAvailability(doctorId, date);
  }

  async bulkUpdateAppointments(appointmentIds: string[], updates: any) {
    const results = [];
    
    for (const id of appointmentIds) {
      const [appointment] = await db.update(appointments)
        .set(updates)
        .where(eq(appointments.id, id))
        .returning();
      
      if (appointment) results.push(appointment);
    }

    return results;
  }

  private async checkTimeSlotConflict(doctorId: string, date: string, time: string) {
    return await db.select()
      .from(appointments)
      .where(and(
        eq(appointments.doctorId, doctorId),
        eq(appointments.appointmentDate, date),
        eq(appointments.appointmentTime, time),
        eq(appointments.status, 'scheduled')
      ));
  }
}

export const appointmentService = new AppointmentService();
