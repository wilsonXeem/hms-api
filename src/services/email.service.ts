import { logger } from '../utils/logger.util';

interface EmailProvider {
  sendEmail(to: string | string[], subject: string, content: string, options?: EmailOptions): Promise<EmailResult>;
}

interface EmailOptions {
  from?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
  isHtml?: boolean;
  priority?: 'high' | 'normal' | 'low';
  replyTo?: string;
}

interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

interface EmailResult {
  success: boolean;
  messageId: string;
  status: 'sent' | 'failed' | 'pending';
  message?: string;
}

// SendGrid Email Provider
class SendGridEmailProvider implements EmailProvider {
  private sendgrid: any;

  constructor() {
    try {
      this.sendgrid = require('@sendgrid/mail');
      this.sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
    } catch (error) {
      logger.warn('SendGrid package not installed. Using mock implementation.');
      this.sendgrid = null;
    }
  }

  async sendEmail(to: string | string[], subject: string, content: string, options?: EmailOptions): Promise<EmailResult> {
    if (!this.sendgrid) {
      return this.mockEmailSend(to, subject);
    }

    try {
      const msg = {
        to: Array.isArray(to) ? to : [to],
        from: options?.from || process.env.FROM_EMAIL || 'noreply@hospital.com',
        subject,
        [options?.isHtml ? 'html' : 'text']: content,
        cc: options?.cc,
        bcc: options?.bcc,
        replyTo: options?.replyTo,
        attachments: options?.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          type: att.contentType
        }))
      };

      const result = await this.sendgrid.send(msg);
      
      return {
        success: true,
        messageId: result[0].headers['x-message-id'],
        status: 'sent'
      };
    } catch (error: any) {
      logger.error('SendGrid email sending error:', error);
      return {
        success: false,
        messageId: '',
        status: 'failed',
        message: error.message
      };
    }
  }

  private mockEmailSend(to: string | string[], subject: string): EmailResult {
    const isSuccessful = Math.random() > 0.05;
    return {
      success: isSuccessful,
      messageId: `mock_email_${Date.now()}`,
      status: isSuccessful ? 'sent' : 'failed',
      message: isSuccessful ? 'Mock email sent successfully' : 'Mock email failed'
    };
  }
}

// AWS SES Email Provider
class AWSSESProvider implements EmailProvider {
  private ses: any;

  constructor() {
    try {
      const AWS = require('aws-sdk');
      this.ses = new AWS.SES({
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      });
    } catch (error) {
      logger.warn('AWS SDK not installed. Using mock implementation.');
      this.ses = null;
    }
  }

  async sendEmail(to: string | string[], subject: string, content: string, options?: EmailOptions): Promise<EmailResult> {
    if (!this.ses) {
      return this.mockEmailSend(to, subject);
    }

    try {
      const params = {
        Source: options?.from || process.env.FROM_EMAIL || 'noreply@hospital.com',
        Destination: {
          ToAddresses: Array.isArray(to) ? to : [to],
          CcAddresses: options?.cc,
          BccAddresses: options?.bcc
        },
        Message: {
          Subject: { Data: subject },
          Body: options?.isHtml ? 
            { Html: { Data: content } } : 
            { Text: { Data: content } }
        },
        ReplyToAddresses: options?.replyTo ? [options.replyTo] : undefined
      };

      const result = await this.ses.sendEmail(params).promise();
      
      return {
        success: true,
        messageId: result.MessageId,
        status: 'sent'
      };
    } catch (error: any) {
      logger.error('AWS SES email sending error:', error);
      return {
        success: false,
        messageId: '',
        status: 'failed',
        message: error.message
      };
    }
  }

  private mockEmailSend(to: string | string[], subject: string): EmailResult {
    const isSuccessful = Math.random() > 0.05;
    return {
      success: isSuccessful,
      messageId: `mock_aws_email_${Date.now()}`,
      status: isSuccessful ? 'sent' : 'failed',
      message: isSuccessful ? 'Mock AWS email sent successfully' : 'Mock AWS email failed'
    };
  }
}

export class EmailService {
  private providers: Map<string, EmailProvider> = new Map();

  constructor() {
    this.providers.set('sendgrid', new SendGridEmailProvider());
    this.providers.set('aws-ses', new AWSSESProvider());
  }

  private getProvider(providerName: string = 'sendgrid'): EmailProvider {
    const provider = this.providers.get(providerName.toLowerCase());
    if (!provider) {
      throw new Error(`Email provider '${providerName}' not supported`);
    }
    return provider;
  }

  async sendEmail(
    to: string | string[], 
    subject: string, 
    content: string, 
    options?: EmailOptions,
    provider: string = 'sendgrid'
  ): Promise<EmailResult> {
    const emailProvider = this.getProvider(provider);
    return await emailProvider.sendEmail(to, subject, content, options);
  }

  // Medical notification templates
  async sendAppointmentConfirmation(
    patientEmail: string,
    patientName: string,
    doctorName: string,
    appointmentDate: string,
    appointmentTime: string,
    facilityName: string
  ): Promise<EmailResult> {
    const subject = `Appointment Confirmation - ${facilityName}`;
    const content = `
      <h2>Appointment Confirmation</h2>
      <p>Dear ${patientName},</p>
      <p>Your appointment has been confirmed with the following details:</p>
      <ul>
        <li><strong>Doctor:</strong> Dr. ${doctorName}</li>
        <li><strong>Date:</strong> ${appointmentDate}</li>
        <li><strong>Time:</strong> ${appointmentTime}</li>
        <li><strong>Location:</strong> ${facilityName}</li>
      </ul>
      <p>Please arrive 15 minutes early for check-in.</p>
      <p>If you need to reschedule, please contact us at least 24 hours in advance.</p>
      <p>Best regards,<br>${facilityName}</p>
    `;

    return this.sendEmail(patientEmail, subject, content, { isHtml: true });
  }

  async sendLabResultsNotification(
    patientEmail: string,
    patientName: string,
    testNames: string[],
    portalLink: string
  ): Promise<EmailResult> {
    const subject = 'Lab Results Available';
    const tests = testNames.join(', ');
    const content = `
      <h2>Lab Results Available</h2>
      <p>Dear ${patientName},</p>
      <p>Your lab results for the following tests are now available:</p>
      <p><strong>${tests}</strong></p>
      <p>You can view your results by logging into your patient portal:</p>
      <p><a href="${portalLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Results</a></p>
      <p>If you have any questions about your results, please contact your healthcare provider.</p>
      <p>Best regards,<br>Your Healthcare Team</p>
    `;

    return this.sendEmail(patientEmail, subject, content, { isHtml: true });
  }

  async sendPrescriptionReadyNotification(
    patientEmail: string,
    patientName: string,
    medications: string[],
    pharmacyName: string,
    pharmacyPhone: string
  ): Promise<EmailResult> {
    const subject = 'Prescription Ready for Pickup';
    const meds = medications.join(', ');
    const content = `
      <h2>Prescription Ready</h2>
      <p>Dear ${patientName},</p>
      <p>Your prescription for <strong>${meds}</strong> is ready for pickup at:</p>
      <p><strong>${pharmacyName}</strong><br>
      Phone: ${pharmacyPhone}</p>
      <p>Please bring a valid ID when picking up your medication.</p>
      <p>Pharmacy hours: Monday-Friday 8:00 AM - 8:00 PM, Saturday 9:00 AM - 6:00 PM</p>
      <p>Best regards,<br>${pharmacyName}</p>
    `;

    return this.sendEmail(patientEmail, subject, content, { isHtml: true });
  }

  async sendBillingStatement(
    patientEmail: string,
    patientName: string,
    statementData: any,
    paymentLink: string
  ): Promise<EmailResult> {
    const subject = `Billing Statement - Account #${statementData.accountNumber}`;
    const content = `
      <h2>Billing Statement</h2>
      <p>Dear ${patientName},</p>
      <p>Please find your billing statement below:</p>
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr style="background-color: #f8f9fa;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Service</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Amount</th>
        </tr>
        ${statementData.services.map((service: any) => `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">${service.description}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${service.amount.toFixed(2)}</td>
          </tr>
        `).join('')}
        <tr style="background-color: #f8f9fa; font-weight: bold;">
          <td style="border: 1px solid #ddd; padding: 8px;">Total Amount Due</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${statementData.totalAmount.toFixed(2)}</td>
        </tr>
      </table>
      <p>Due Date: <strong>${statementData.dueDate}</strong></p>
      <p><a href="${paymentLink}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Pay Online</a></p>
      <p>Thank you for choosing our healthcare services.</p>
    `;

    return this.sendEmail(patientEmail, subject, content, { isHtml: true });
  }

  async sendCriticalAlert(
    doctorEmail: string,
    patientName: string,
    alertMessage: string,
    urgencyLevel: 'high' | 'critical'
  ): Promise<EmailResult> {
    const subject = `${urgencyLevel.toUpperCase()} ALERT - Patient: ${patientName}`;
    const content = `
      <h2 style="color: ${urgencyLevel === 'critical' ? '#dc3545' : '#fd7e14'};">
        ${urgencyLevel.toUpperCase()} PATIENT ALERT
      </h2>
      <p><strong>Patient:</strong> ${patientName}</p>
      <p><strong>Alert:</strong> ${alertMessage}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <p style="color: #dc3545; font-weight: bold;">
        Please review this alert immediately and take appropriate action.
      </p>
      <p>This is an automated alert from the Hospital Management System.</p>
    `;

    return this.sendEmail(doctorEmail, subject, content, { 
      isHtml: true, 
      priority: urgencyLevel === 'critical' ? 'high' : 'normal' 
    });
  }

  async sendPasswordReset(
    userEmail: string,
    userName: string,
    resetLink: string,
    expirationTime: string
  ): Promise<EmailResult> {
    const subject = 'Password Reset Request';
    const content = `
      <h2>Password Reset Request</h2>
      <p>Dear ${userName},</p>
      <p>We received a request to reset your password. Click the link below to create a new password:</p>
      <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>This link will expire on ${expirationTime}.</p>
      <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
      <p>Best regards,<br>Hospital Management System</p>
    `;

    return this.sendEmail(userEmail, subject, content, { isHtml: true });
  }

  async sendWelcomeEmail(
    userEmail: string,
    userName: string,
    userRole: string,
    loginLink: string
  ): Promise<EmailResult> {
    const subject = 'Welcome to Hospital Management System';
    const content = `
      <h2>Welcome to Hospital Management System</h2>
      <p>Dear ${userName},</p>
      <p>Welcome! Your account has been created with the role of <strong>${userRole}</strong>.</p>
      <p>You can now access the system using the following link:</p>
      <p><a href="${loginLink}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Access System</a></p>
      <p>For security reasons, we recommend changing your password after your first login.</p>
      <p>If you have any questions, please contact our support team.</p>
      <p>Best regards,<br>Hospital Management System Team</p>
    `;

    return this.sendEmail(userEmail, subject, content, { isHtml: true });
  }

  async sendBulkEmail(
    recipients: string[],
    subject: string,
    content: string,
    options?: EmailOptions
  ): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    const batchSize = 50; // Send in batches to avoid rate limits

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      try {
        const result = await this.sendEmail(batch, subject, content, options);
        results.push(result);
      } catch (error) {
        logger.error(`Error sending bulk email batch ${i / batchSize + 1}:`, error);
        results.push({
          success: false,
          messageId: '',
          status: 'failed',
          message: 'Batch sending failed'
        });
      }

      // Add delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const emailService = new EmailService();