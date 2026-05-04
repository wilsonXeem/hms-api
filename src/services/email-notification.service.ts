import { logger } from '../utils/logger.util';

// Stub MailService implementation
class MailService {
  static async sendEmail(to: string, subject: string, html: string) {
    logger.info(`[STUB] Email sent to ${to}: ${subject}`);
  }
}

export class EmailNotificationService {
  static async sendContactConfirmation(contactData: {
    name: string;
    email: string;
    subject: string;
  }) {
    const subject = 'Contact Form Received - Thank You';
    const html = `
      <h2>Thank you for contacting us</h2>
      <p>Dear ${contactData.name},</p>
      <p>We have received your message regarding "${contactData.subject}" and will respond within 24 hours.</p>
      <p>Best regards,<br>Hospital Management Team</p>
    `;
    
    await MailService.sendEmail(contactData.email, subject, html);
  }

  static async sendAppointmentConfirmation(appointmentData: {
    patientName: string;
    email: string;
    appointmentDate: string;
    appointmentTime: string;
    doctorName?: string;
  }) {
    const subject = 'Appointment Booking Confirmation';
    const html = `
      <h2>Appointment Confirmed</h2>
      <p>Dear ${appointmentData.patientName},</p>
      <p>Your appointment has been scheduled for:</p>
      <ul>
        <li>Date: ${appointmentData.appointmentDate}</li>
        <li>Time: ${appointmentData.appointmentTime}</li>
        ${appointmentData.doctorName ? `<li>Doctor: ${appointmentData.doctorName}</li>` : ''}
      </ul>
      <p>Please arrive 15 minutes early.</p>
      <p>Best regards,<br>Hospital Management Team</p>
    `;
    
    await MailService.sendEmail(appointmentData.email, subject, html);
  }

  static async notifyAdminContact(contactData: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }) {
    const subject = `New Contact Form: ${contactData.subject}`;
    const html = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${contactData.name}</p>
      <p><strong>Email:</strong> ${contactData.email}</p>
      ${contactData.phone ? `<p><strong>Phone:</strong> ${contactData.phone}</p>` : ''}
      <p><strong>Subject:</strong> ${contactData.subject}</p>
      <p><strong>Message:</strong></p>
      <p>${contactData.message}</p>
    `;
    
    // Send to admin email from environment configuration
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.warn('ADMIN_EMAIL not configured - contact notification not sent to admin');
      return;
    }
    await MailService.sendEmail(adminEmail, subject, html);
  }

  static async sendCriticalLabResult(data: {
    doctorEmail: string;
    doctorName: string;
    patientName: string;
    testName: string;
    resultValue: string;
  }) {
    const subject = `🚨 CRITICAL Lab Result Alert - ${data.testName}`;
    const html = `
      <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px;">
        <h2 style="color: #856404; margin: 0 0 15px 0;">🚨 CRITICAL Lab Result</h2>
        <p><strong>Doctor:</strong> ${data.doctorName}</p>
        <p><strong>Patient:</strong> ${data.patientName}</p>
        <p><strong>Test:</strong> ${data.testName}</p>
        <p><strong>Result:</strong> <span style="color: #dc3545; font-weight: bold;">${data.resultValue}</span></p>
        <p style="margin-top: 20px; padding: 15px; background: #f8d7da; border-radius: 4px; color: #721c24;">
          <strong>⚠️ IMMEDIATE ATTENTION REQUIRED</strong><br>
          This result requires urgent clinical review and potential patient contact.
        </p>
      </div>
    `;
    
    await MailService.sendEmail(data.doctorEmail, subject, html);
  }

  static async sendNotificationEmail(email: string, title: string, message: string, priority?: string) {
    const subject = `${priority === 'urgent' ? '🚨 URGENT: ' : priority === 'high' ? '⚠️ ' : ''}${title}`;
    const html = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: ${priority === 'urgent' ? '#dc3545' : priority === 'high' ? '#fd7e14' : '#007bff'}; margin: 0 0 15px 0;">
          ${priority === 'urgent' ? '🚨' : priority === 'high' ? '⚠️' : '📢'} ${title}
        </h2>
        <p style="font-size: 16px; line-height: 1.5;">${message}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">This is an automated notification from Hospital Management System</p>
      </div>
    `;
    
    await MailService.sendEmail(email, subject, html);
  }
}