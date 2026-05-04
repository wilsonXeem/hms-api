import { Request, Response } from 'express';
import { db } from '../drizzle/schema';
import { facilities, contactSubmissions, appointments, users } from '../models';
import { eq, and } from 'drizzle-orm';
import { EmailNotificationService } from '../services/email-notification.service';
import { AppointmentAvailabilityService } from '../services/appointment-availability.service';

export class PublicController {
  static async getFacilityInfo(req: Request, res: Response) {
    try {
      const facility = await db.select().from(facilities).limit(1);
      res.json(facility[0] || {});
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch facility info' });
    }
  }

  static async submitContact(req: Request, res: Response) {
    try {
      const { name, email, phone, subject, message } = req.body;
      
      const submission = await db.insert(contactSubmissions).values({
        name,
        email,
        phone,
        subject,
        message,
        submittedAt: new Date()
      }).returning();

      // Send confirmation emails
      try {
        await Promise.all([
          EmailNotificationService.sendContactConfirmation({ name, email, subject }),
          EmailNotificationService.notifyAdminContact({ name, email, phone, subject, message })
        ]);
      } catch (emailError) {
        console.warn('Failed to send contact confirmation emails:', emailError);
      }

      res.json({ 
        success: true, 
        id: submission[0].id,
        message: 'Contact form submitted successfully. We will respond within 24 hours.'
      });
    } catch (error) {
      console.error('Contact form submission error:', error);
      res.status(500).json({ error: 'Failed to submit contact form. Please try again.' });
    }
  }

  static async bookAppointment(req: Request, res: Response) {
    try {
      const { patientName, email, phone, doctorId, appointmentDate, appointmentTime, reason } = req.body;
      
      // Verify doctor exists and is available
      const doctor = await AppointmentAvailabilityService.getDoctorInfo(doctorId);
      if (!doctor) {
        return res.status(400).json({ error: 'Doctor not found' });
      }
      
      // Check availability
      const isAvailable = await AppointmentAvailabilityService.checkDoctorAvailability(
        doctorId, appointmentDate, appointmentTime
      );
      
      if (!isAvailable) {
        return res.status(400).json({ 
          error: 'Time slot not available',
          message: 'This appointment slot is already booked. Please select a different time.'
        });
      }
      
      const appointment = await db.insert(appointments).values({
        patientName,
        email,
        phone,
        doctorId,
        appointmentDate,
        appointmentTime,
        reason,
        status: 'pending',
        isPublicBooking: true,
        createdAt: new Date()
      }).returning();

      // Send confirmation email
      try {
        await EmailNotificationService.sendAppointmentConfirmation({
          patientName,
          email,
          appointmentDate,
          appointmentTime,
          doctorName: doctor.name
        });
      } catch (emailError) {
        console.warn('Failed to send appointment confirmation email:', emailError);
      }

      res.json({ 
        success: true, 
        appointmentId: appointment[0].id,
        message: 'Appointment booked successfully. Confirmation email sent.'
      });
    } catch (error) {
      console.error('Appointment booking error:', error);
      res.status(500).json({ error: 'Failed to book appointment. Please try again.' });
    }
  }

  static async getAvailableDoctors(req: Request, res: Response) {
    try {
      const doctors = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        department: users.department
      }).from(users).where(and(
        eq(users.role, 'doctor'),
        eq(users.isActive, true)
      ));

      res.json(doctors);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch doctors' });
    }
  }

  static async getHospitalServices(req: Request, res: Response) {
    try {
      const facility = await db.select({
        services: facilities.services,
        departments: facilities.departments
      }).from(facilities).limit(1);

      res.json(facility[0] || { services: [], departments: [] });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch services' });
    }
  }

  static async getAvailableSlots(req: Request, res: Response) {
    try {
      const { doctorId, date } = req.query;
      
      if (!doctorId || !date) {
        return res.status(400).json({ error: 'Doctor ID and date are required' });
      }
      
      const availableSlots = await AppointmentAvailabilityService.getAvailableTimeSlots(
        doctorId as string, 
        date as string
      );
      
      res.json({ availableSlots });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch available slots' });
    }
  }
}