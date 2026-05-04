import { Server as HTTPServer } from 'http';
import { logger } from '../utils/logger.util';

export class RealTimeNotificationService {
  private connectedUsers: Map<string, string> = new Map();

  constructor(server?: HTTPServer) {
    logger.info('RealTime notification service initialized (stub)');
  }

  async sendToUser(userId: string, notification: any) {
    logger.info(`[STUB] Notification to user ${userId}: ${notification.title}`);
  }

  async sendToFacility(facilityId: string, notification: any) {
    logger.info(`[STUB] Facility notification to ${facilityId}: ${notification.title}`);
  }

  async sendToRole(role: string, notification: any) {
    logger.info(`[STUB] Role notification to ${role}: ${notification.title}`);
  }

  async sendSystemAlert(alert: any) {
    logger.info(`[STUB] System alert: ${alert.title}`);
  }

  // Send appointment reminder
  async sendAppointmentReminder(userId: string, appointmentData: any) {
    const notification = {
      type: 'appointment_reminder',
      title: 'Appointment Reminder',
      message: `You have an appointment at ${appointmentData.appointmentTime}`,
      data: appointmentData,
      priority: 'high',
      timestamp: new Date()
    };

    await this.sendToUser(userId, notification);
  }

  // Send inventory alert
  async sendInventoryAlert(facilityId: string, itemData: any) {
    const notification = {
      type: 'inventory_alert',
      title: 'Low Stock Alert',
      message: `${itemData.itemName} is running low (${itemData.currentStock} remaining)`,
      data: itemData,
      priority: 'high',
      timestamp: new Date()
    };

    await this.sendToRole('inventory_manager', notification);
    await this.sendToRole('admin', notification);
  }

  // Send lab result notification
  async sendLabResultNotification(userId: string, labData: any) {
    const notification = {
      type: 'lab_result',
      title: 'Lab Results Available',
      message: `Your ${labData.testName} results are ready`,
      data: labData,
      priority: 'normal',
      timestamp: new Date()
    };

    await this.sendToUser(userId, notification);
  }

  // Send emergency alert
  async sendEmergencyAlert(facilityId: string, emergencyData: any) {
    const notification = {
      type: 'emergency',
      title: 'Emergency Alert',
      message: emergencyData.message,
      data: emergencyData,
      priority: 'urgent',
      timestamp: new Date()
    };

    await this.sendToFacility(facilityId, notification);
  }

  getConnectedUsersCount(): number {
    return 0;
  }

  getConnectedUsersInFacility(facilityId: string): number {
    return 0;
  }

  sendTypingIndicator(conversationId: string, userId: string, isTyping: boolean) {
    logger.info(`[STUB] Typing indicator: ${userId} ${isTyping ? 'started' : 'stopped'} typing`);
  }

  async sendDashboardUpdate(facilityId: string, updateData: any) {
    logger.info(`[STUB] Dashboard update for facility ${facilityId}`);
  }

  async sendAppointmentStatusUpdate(facilityId: string, appointmentData: any) {
    logger.info(`[STUB] Appointment update for facility ${facilityId}`);
  }

  async sendLabStatusUpdate(requestId: string, labData: any) {
    logger.info(`[STUB] Lab status update for request ${requestId}`);
  }

  async sendLabResultUpdate(requestId: string, resultData: any) {
    logger.info(`[STUB] Lab result update for request ${requestId}`);
  }

  async sendCriticalLabAlert(facilityId: string, criticalData: any) {
    logger.info(`[STUB] Critical lab alert for facility ${facilityId}`);
  }
}

export let realTimeNotificationService: RealTimeNotificationService;

export const initializeRealTimeNotifications = (server: HTTPServer) => {
  realTimeNotificationService = new RealTimeNotificationService(server);
  return realTimeNotificationService;
};