import { db } from '../drizzle/schema';
import { appointments, users } from '../models';
import { eq, and } from 'drizzle-orm';

export class AppointmentAvailabilityService {
  static async checkDoctorAvailability(
    doctorId: string, 
    appointmentDate: string, 
    appointmentTime: string
  ): Promise<boolean> {
    const existingAppointment = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.doctorId, doctorId),
        eq(appointments.appointmentDate, appointmentDate),
        eq(appointments.appointmentTime, appointmentTime)
      ))
      .limit(1);

    return existingAppointment.length === 0;
  }

  static async getAvailableTimeSlots(
    doctorId: string, 
    appointmentDate: string
  ): Promise<string[]> {
    const bookedSlots = await db
      .select({ time: appointments.appointmentTime })
      .from(appointments)
      .where(and(
        eq(appointments.doctorId, doctorId),
        eq(appointments.appointmentDate, appointmentDate)
      ));

    const bookedTimes = bookedSlots.map(slot => slot.time);
    
    // Standard time slots (9 AM to 5 PM, 30-minute intervals)
    const allSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
    ];

    return allSlots.filter(slot => !bookedTimes.includes(slot));
  }

  static async getDoctorInfo(doctorId: string) {
    const doctor = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        department: users.department
      })
      .from(users)
      .where(eq(users.id, doctorId))
      .limit(1);

    if (doctor[0]) {
      return {
        ...doctor[0],
        name: `${doctor[0].firstName} ${doctor[0].lastName}`
      };
    }
    return null;
  }
}