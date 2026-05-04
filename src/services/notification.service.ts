import { eq, and, desc } from 'drizzle-orm';
import { db } from '../config/db.config';
import { notifications } from '../models/notifications.model';
import { users } from '../models/users.model';
import { patients } from '../models/patients.model';
import { logger } from '../utils/logger.util';
import { EmailNotificationService } from './email-notification.service';

let realTimeService: any = null;

export const setRealTimeService = (service: any) => {
  realTimeService = service;
};

export class NotificationService {
  static async createNotification(data: {
    facilityId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    priority?: string;
  }) {
    try {
      const [notification] = await db.insert(notifications).values({
        facilityId: data.facilityId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
        priority: data.priority || 'normal'
      }).returning();

      // Send real-time notification if service is available
      if (realTimeService) {
        await realTimeService.sendToUser(data.userId, notification);
      }
      
      // Send email for high priority notifications
      if (data.priority === 'high' || data.priority === 'urgent') {
        const user = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
        if (user.length && user[0].email) {
          await EmailNotificationService.sendNotificationEmail(
            user[0].email,
            data.title,
            data.message,
            data.priority
          );
        }
      }
      
      logger.info(`Notification created: ${notification.id} for user: ${data.userId}`);
      return notification;
    } catch (error) {
      logger.error('Create notification error:', error);
      throw error;
    }
  }

  static async getUserNotifications(userId: string, limit = 50) {
    try {
      // Validate limit
      const validLimit = Math.min(Math.max(limit, 1), 100);
      
      return await db.select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(validLimit);
    } catch (error) {
      logger.error('Get user notifications error:', error);
      throw error;
    }
  }

  static async markAsRead(notificationId: string, userId: string) {
    try {
      const [updated] = await db.update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ))
        .returning();

      return updated;
    } catch (error) {
      logger.error('Mark notification as read error:', error);
      throw error;
    }
  }

  static async sendAppointmentNotification(patientId: string, type: string, appointmentData: any) {
    try {
      const patient = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
      if (!patient.length) return;

      const titles = {
        scheduled: 'Appointment Scheduled',
        rescheduled: 'Appointment Rescheduled',
        cancelled: 'Appointment Cancelled',
        reminder: 'Appointment Reminder',
        completed: 'Appointment Completed'
      };

      const messages = {
        scheduled: `Your appointment has been scheduled for ${appointmentData.appointmentDate} at ${appointmentData.appointmentTime}`,
        rescheduled: `Your appointment has been rescheduled to ${appointmentData.appointmentDate} at ${appointmentData.appointmentTime}`,
        cancelled: 'Your appointment has been cancelled',
        reminder: `Reminder: You have an appointment tomorrow at ${appointmentData.appointmentTime}`,
        completed: 'Your appointment has been completed'
      };

      // Create notification for patient (if they have a user account)
      const patientUser = await db.select().from(users).where(eq(users.id, patientId)).limit(1);
      if (patientUser.length) {
        await this.createNotification({
          facilityId: patient[0].facilityId!,
          userId: patientId,
          type: 'appointment',
          title: titles[type as keyof typeof titles],
          message: messages[type as keyof typeof messages],
          data: appointmentData,
          priority: type === 'reminder' ? 'high' : 'normal'
        });
      }

      // Create notification for doctor
      if (appointmentData.doctorId) {
        await this.createNotification({
          facilityId: patient[0].facilityId!,
          userId: appointmentData.doctorId,
          type: 'appointment',
          title: `Patient Appointment ${type}`,
          message: `Patient ${patient[0].firstName} ${patient[0].lastName} appointment ${type}`,
          data: appointmentData,
          priority: 'normal'
        });
      }
    } catch (error) {
      logger.error('Send appointment notification error:', error);
    }
  }

  static async sendInventoryAlert(facilityId: string, itemName: string, currentStock: number, minLevel: number) {
    try {
      if (!facilityId || !itemName) {
        logger.warn('Invalid parameters for inventory alert');
        return;
      }

      // Get all inventory managers and admins
      const managers = await db.select()
        .from(users)
        .where(and(
          eq(users.facilityId, facilityId),
          eq(users.role, 'inventory_manager')
        ));

      const admins = await db.select()
        .from(users)
        .where(and(
          eq(users.facilityId, facilityId),
          eq(users.role, 'admin')
        ));

      const recipients = [...managers, ...admins];
      
      if (recipients.length === 0) {
        logger.warn(`No recipients found for inventory alert in facility ${facilityId}`);
        return;
      }

      for (const user of recipients) {
        await this.createNotification({
          facilityId,
          userId: user.id,
          type: 'inventory',
          title: 'Low Stock Alert',
          message: `${itemName} is running low. Current stock: ${currentStock}, Minimum level: ${minLevel}`,
          data: { itemName, currentStock, minLevel },
          priority: 'high'
        });
      }
    } catch (error) {
      logger.error('Send inventory alert error:', error);
    }
  }

  static async sendLabResultNotification(patientId: string, facilityId: string, testName: string) {
    try {
      // Notify patient
      const patientUser = await db.select().from(users).where(eq(users.id, patientId)).limit(1);
      if (patientUser.length) {
        await this.createNotification({
          facilityId,
          userId: patientId,
          type: 'lab_result',
          title: 'Lab Results Available',
          message: `Your ${testName} results are now available`,
          data: { testName },
          priority: 'normal'
        });
      }

      // Notify doctors
      const doctors = await db.select()
        .from(users)
        .where(and(
          eq(users.facilityId, facilityId),
          eq(users.role, 'doctor')
        ));

      for (const doctor of doctors) {
        await this.createNotification({
          facilityId,
          userId: doctor.id,
          type: 'lab_result',
          title: 'New Lab Results',
          message: `New ${testName} results available for review`,
          data: { testName, patientId },
          priority: 'normal'
        });
      }
    } catch (error) {
      logger.error('Send lab result notification error:', error);
    }
  }
}

export const notificationService = {
  sendAppointmentConfirmation: (appointment: any) =>
    NotificationService.sendAppointmentNotification(appointment.patientId, 'scheduled', appointment),
  sendAppointmentRescheduled: (appointment: any) =>
    NotificationService.sendAppointmentNotification(appointment.patientId, 'rescheduled', appointment),
  sendAppointmentCancelled: (appointment: any) =>
    NotificationService.sendAppointmentNotification(appointment.patientId, 'cancelled', appointment),
  sendAppointmentReminder: (appointment: any) =>
    NotificationService.sendAppointmentNotification(appointment.patientId, 'reminder', appointment)
};
