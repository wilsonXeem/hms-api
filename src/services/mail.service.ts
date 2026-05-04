import { sendEmail, sendWelcomeEmail, sendPasswordResetEmail } from '../utils/email.util';
import { logger } from '../utils/logger.util';
import { config } from '../config/app.config';

export class MailService {
  
  static async sendAppointmentConfirmation(
    patientEmail: string, 
    patientName: string, 
    doctorName: string, 
    appointmentDate: string, 
    appointmentTime: string
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Appointment Confirmed</h2>
        <p>Dear ${patientName},</p>
        <p>Your appointment has been confirmed with the following details:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Doctor:</strong> ${doctorName}</p>
          <p><strong>Date:</strong> ${appointmentDate}</p>
          <p><strong>Time:</strong> ${appointmentTime}</p>
        </div>
        <p>Please arrive 15 minutes early for check-in.</p>
        <p>Best regards,<br>Hospital Management Team</p>
      </div>
    `;

    return sendEmail({
      to: patientEmail,
      subject: 'Appointment Confirmation',
      html
    });
  }

  static async sendLabResultsReady(
    patientEmail: string, 
    patientName: string, 
    testNames: string[]
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3498db;">Lab Results Ready</h2>
        <p>Dear ${patientName},</p>
        <p>Your lab results are now available:</p>
        <ul>
          ${testNames.map(test => `<li>${test}</li>`).join('')}
        </ul>
        <p>Please log in to your patient portal or contact us to review your results.</p>
        <p>Best regards,<br>Hospital Management Team</p>
      </div>
    `;

    return sendEmail({
      to: patientEmail,
      subject: 'Lab Results Available',
      html
    });
  }

  static async sendCriticalResultAlert(
    doctorEmail: string, 
    doctorName: string, 
    patientName: string, 
    testName: string, 
    result: string
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">🚨 Critical Lab Result Alert</h2>
        <p>Dear Dr. ${doctorName},</p>
        <p><strong>URGENT:</strong> Critical lab result requires immediate attention.</p>
        <div style="background-color: #fff5f5; border-left: 4px solid #e74c3c; padding: 20px; margin: 20px 0;">
          <p><strong>Patient:</strong> ${patientName}</p>
          <p><strong>Test:</strong> ${testName}</p>
          <p><strong>Result:</strong> ${result}</p>
        </div>
        <p>Please review and take appropriate action immediately.</p>
        <p>Best regards,<br>Hospital Management System</p>
      </div>
    `;

    return sendEmail({
      to: doctorEmail,
      subject: '🚨 CRITICAL: Lab Result Alert',
      html
    });
  }

  static async sendPrescriptionReady(
    patientEmail: string, 
    patientName: string, 
    medications: string[]
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #9b59b6;">Prescription Ready for Pickup</h2>
        <p>Dear ${patientName},</p>
        <p>Your prescription is ready for pickup at our pharmacy:</p>
        <ul>
          ${medications.map(med => `<li>${med}</li>`).join('')}
        </ul>
        <p>Please bring a valid ID when collecting your medication.</p>
        <p>Best regards,<br>Hospital Pharmacy</p>
      </div>
    `;

    return sendEmail({
      to: patientEmail,
      subject: 'Prescription Ready for Pickup',
      html
    });
  }

  static async sendPaymentReminder(
    patientEmail: string, 
    patientName: string, 
    amount: number, 
    dueDate: string
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f39c12;">Payment Reminder</h2>
        <p>Dear ${patientName},</p>
        <p>This is a friendly reminder about your outstanding balance:</p>
        <div style="background-color: #fff8e1; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount Due:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Due Date:</strong> ${dueDate}</p>
        </div>
        <p>Please make your payment at your earliest convenience.</p>
        <p>Best regards,<br>Hospital Billing Department</p>
      </div>
    `;

    return sendEmail({
      to: patientEmail,
      subject: 'Payment Reminder',
      html
    });
  }

  static async sendWelcome(email: string, name: string): Promise<boolean> {
    return sendWelcomeEmail(email, name);
  }

  static async sendPasswordReset(email: string, resetToken: string): Promise<boolean> {
    return sendPasswordResetEmail(email, resetToken);
  }
}

export const mailService = {
  sendPasswordResetEmail: MailService.sendPasswordReset,
  sendWelcomeEmail: MailService.sendWelcome
};
