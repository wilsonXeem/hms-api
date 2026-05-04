import { Request, Response } from 'express';
import { smsService } from '../services/sms.service';
import { responseUtil } from '../utils/response.util';
import { logger } from '../utils/logger.util';

export class SMSController {
  
  static async sendSMS(req: Request, res: Response) {
    try {
      const { to, message, provider = 'twilio' } = req.body;
      
      if (!to || !message) {
        return responseUtil.sendError(res, 'Phone number and message are required', undefined, 400);
      }

      const result = await smsService.sendSMS(to, message, provider);
      
      if (result.success) {
        return responseUtil.sendSuccess(res, 'SMS sent successfully', result);
      } else {
        return responseUtil.sendError(res, 'Failed to send SMS', result.message, 400);
      }
    } catch (error: any) {
      logger.error('Error sending SMS:', error);
      return responseUtil.sendError(res, 'Failed to send SMS');
    }
  }

  static async sendAppointmentReminder(req: Request, res: Response) {
    try {
      const { patientPhone, patientName, doctorName, appointmentDate, appointmentTime } = req.body;
      
      if (!patientPhone || !patientName || !doctorName || !appointmentDate || !appointmentTime) {
        return responseUtil.sendError(res, 'All appointment details are required', undefined, 400);
      }

      const result = await smsService.sendAppointmentReminder(
        patientPhone, patientName, doctorName, appointmentDate, appointmentTime
      );
      
      if (result.success) {
        return responseUtil.sendSuccess(res, 'Appointment reminder sent', result);
      } else {
        return responseUtil.sendError(res, 'Failed to send appointment reminder', result.message, 400);
      }
    } catch (error: any) {
      logger.error('Error sending appointment reminder:', error);
      return responseUtil.sendError(res, 'Failed to send appointment reminder');
    }
  }

  static async sendLabResultsNotification(req: Request, res: Response) {
    try {
      const { patientPhone, patientName, testNames } = req.body;
      
      if (!patientPhone || !patientName || !testNames || !Array.isArray(testNames)) {
        return responseUtil.sendError(res, 'Patient phone, name, and test names array are required', undefined, 400);
      }

      const result = await smsService.sendLabResultsReady(patientPhone, patientName, testNames);
      
      if (result.success) {
        return responseUtil.sendSuccess(res, 'Lab results notification sent', result);
      } else {
        return responseUtil.sendError(res, 'Failed to send lab results notification', result.message, 400);
      }
    } catch (error: any) {
      logger.error('Error sending lab results notification:', error);
      return responseUtil.sendError(res, 'Failed to send lab results notification');
    }
  }

  static async sendCriticalAlert(req: Request, res: Response) {
    try {
      const { doctorPhone, patientName, alertMessage } = req.body;
      
      if (!doctorPhone || !patientName || !alertMessage) {
        return responseUtil.sendError(res, 'Doctor phone, patient name, and alert message are required', undefined, 400);
      }

      const result = await smsService.sendCriticalAlert(doctorPhone, patientName, alertMessage);
      
      if (result.success) {
        return responseUtil.sendSuccess(res, 'Critical alert sent', result);
      } else {
        return responseUtil.sendError(res, 'Failed to send critical alert', result.message, 400);
      }
    } catch (error: any) {
      logger.error('Error sending critical alert:', error);
      return responseUtil.sendError(res, 'Failed to send critical alert');
    }
  }

  static async sendPrescriptionNotification(req: Request, res: Response) {
    try {
      const { patientPhone, patientName, medications } = req.body;
      
      if (!patientPhone || !patientName || !medications || !Array.isArray(medications)) {
        return responseUtil.sendError(res, 'Patient phone, name, and medications array are required', undefined, 400);
      }

      const result = await smsService.sendPrescriptionReady(patientPhone, patientName, medications);
      
      if (result.success) {
        return responseUtil.sendSuccess(res, 'Prescription notification sent', result);
      } else {
        return responseUtil.sendError(res, 'Failed to send prescription notification', result.message, 400);
      }
    } catch (error: any) {
      logger.error('Error sending prescription notification:', error);
      return responseUtil.sendError(res, 'Failed to send prescription notification');
    }
  }

  static async sendPaymentReminder(req: Request, res: Response) {
    try {
      const { patientPhone, patientName, amount, dueDate } = req.body;
      
      if (!patientPhone || !patientName || !amount || !dueDate) {
        return responseUtil.sendError(res, 'All payment reminder details are required', undefined, 400);
      }

      const result = await smsService.sendPaymentReminder(patientPhone, patientName, amount, dueDate);
      
      if (result.success) {
        return responseUtil.sendSuccess(res, 'Payment reminder sent', result);
      } else {
        return responseUtil.sendError(res, 'Failed to send payment reminder', result.message, 400);
      }
    } catch (error: any) {
      logger.error('Error sending payment reminder:', error);
      return responseUtil.sendError(res, 'Failed to send payment reminder');
    }
  }

  static async sendVerificationCode(req: Request, res: Response) {
    try {
      const { phone, code } = req.body;
      
      if (!phone || !code) {
        return responseUtil.sendError(res, 'Phone number and verification code are required', undefined, 400);
      }

      const result = await smsService.sendVerificationCode(phone, code);
      
      if (result.success) {
        return responseUtil.sendSuccess(res, 'Verification code sent', result);
      } else {
        return responseUtil.sendError(res, 'Failed to send verification code', result.message, 400);
      }
    } catch (error: any) {
      logger.error('Error sending verification code:', error);
      return responseUtil.sendError(res, 'Failed to send verification code');
    }
  }

  static async sendEmergencyAlert(req: Request, res: Response) {
    try {
      const { phone, facilityName, alertType } = req.body;
      
      if (!phone || !facilityName || !alertType) {
        return responseUtil.sendError(res, 'Phone, facility name, and alert type are required', undefined, 400);
      }

      const result = await smsService.sendEmergencyAlert(phone, facilityName, alertType);
      
      if (result.success) {
        return responseUtil.sendSuccess(res, 'Emergency alert sent', result);
      } else {
        return responseUtil.sendError(res, 'Failed to send emergency alert', result.message, 400);
      }
    } catch (error: any) {
      logger.error('Error sending emergency alert:', error);
      return responseUtil.sendError(res, 'Failed to send emergency alert');
    }
  }

  static async getSupportedProviders(req: Request, res: Response) {
    try {
      const providers = smsService.getSupportedProviders();
      return responseUtil.sendSuccess(res, 'SMS providers retrieved', { providers });
    } catch (error: any) {
      logger.error('Error getting SMS providers:', error);
      return responseUtil.sendError(res, 'Failed to get SMS providers');
    }
  }
}