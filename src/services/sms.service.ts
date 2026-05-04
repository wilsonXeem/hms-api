import { logger } from '../utils/logger.util';

interface SMSProvider {
  sendSMS(to: string, message: string, metadata?: any): Promise<SMSResult>;
}

interface SMSResult {
  success: boolean;
  messageId: string;
  status: 'sent' | 'failed' | 'pending';
  message?: string;
  cost?: number;
}

// Twilio SMS Provider Implementation
class TwilioSMSProvider implements SMSProvider {
  private twilio: any;

  constructor() {
    try {
      this.twilio = require('twilio')(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } catch (error) {
      logger.warn('Twilio package not installed. Using mock implementation.');
      this.twilio = null;
    }
  }

  async sendSMS(to: string, message: string, metadata?: any): Promise<SMSResult> {
    if (!this.twilio) {
      return this.mockSMSSend(to, message);
    }

    try {
      const result = await this.twilio.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to
      });

      return {
        success: true,
        messageId: result.sid,
        status: 'sent',
        cost: parseFloat(result.price) || 0
      };
    } catch (error: any) {
      logger.error('Twilio SMS sending error:', error);
      return {
        success: false,
        messageId: '',
        status: 'failed',
        message: error.message
      };
    }
  }

  private mockSMSSend(to: string, message: string): SMSResult {
    const isSuccessful = Math.random() > 0.05;
    return {
      success: isSuccessful,
      messageId: `mock_sms_${Date.now()}`,
      status: isSuccessful ? 'sent' : 'failed',
      message: isSuccessful ? 'Mock SMS sent successfully' : 'Mock SMS failed',
      cost: 0.05
    };
  }
}

// AWS SNS SMS Provider Implementation
class AWSSNSProvider implements SMSProvider {
  private sns: any;

  constructor() {
    try {
      const AWS = require('aws-sdk');
      this.sns = new AWS.SNS({
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      });
    } catch (error) {
      logger.warn('AWS SDK not installed. Using mock implementation.');
      this.sns = null;
    }
  }

  async sendSMS(to: string, message: string, metadata?: any): Promise<SMSResult> {
    if (!this.sns) {
      return this.mockSMSSend(to, message);
    }

    try {
      const params = {
        Message: message,
        PhoneNumber: to,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional'
          }
        }
      };

      const result = await this.sns.publish(params).promise();

      return {
        success: true,
        messageId: result.MessageId,
        status: 'sent'
      };
    } catch (error: any) {
      logger.error('AWS SNS SMS sending error:', error);
      return {
        success: false,
        messageId: '',
        status: 'failed',
        message: error.message
      };
    }
  }

  private mockSMSSend(to: string, message: string): SMSResult {
    const isSuccessful = Math.random() > 0.05;
    return {
      success: isSuccessful,
      messageId: `mock_aws_sms_${Date.now()}`,
      status: isSuccessful ? 'sent' : 'failed',
      message: isSuccessful ? 'Mock AWS SMS sent successfully' : 'Mock AWS SMS failed'
    };
  }
}

export class SMSService {
  private providers: Map<string, SMSProvider> = new Map();

  constructor() {
    this.providers.set('twilio', new TwilioSMSProvider());
    this.providers.set('aws-sns', new AWSSNSProvider());
  }

  private getProvider(providerName: string = 'twilio'): SMSProvider {
    const provider = this.providers.get(providerName.toLowerCase());
    if (!provider) {
      throw new Error(`SMS provider '${providerName}' not supported`);
    }
    return provider;
  }

  async sendSMS(to: string, message: string, provider: string = 'twilio'): Promise<SMSResult> {
    const smsProvider = this.getProvider(provider);
    return await smsProvider.sendSMS(to, message);
  }

  // Medical notification templates
  async sendAppointmentReminder(
    patientPhone: string, 
    patientName: string, 
    doctorName: string, 
    appointmentDate: string, 
    appointmentTime: string
  ): Promise<SMSResult> {
    const message = `Hi ${patientName}, this is a reminder for your appointment with Dr. ${doctorName} on ${appointmentDate} at ${appointmentTime}. Please arrive 15 minutes early.`;
    return this.sendSMS(patientPhone, message);
  }

  async sendLabResultsReady(
    patientPhone: string, 
    patientName: string, 
    testNames: string[]
  ): Promise<SMSResult> {
    const tests = testNames.join(', ');
    const message = `Hi ${patientName}, your lab results for ${tests} are ready. Please log in to your patient portal or contact us to review.`;
    return this.sendSMS(patientPhone, message);
  }

  async sendCriticalAlert(
    doctorPhone: string, 
    patientName: string, 
    alertMessage: string
  ): Promise<SMSResult> {
    const message = `URGENT: Critical alert for patient ${patientName}. ${alertMessage}. Please review immediately.`;
    return this.sendSMS(doctorPhone, message);
  }

  async sendPrescriptionReady(
    patientPhone: string, 
    patientName: string, 
    medications: string[]
  ): Promise<SMSResult> {
    const meds = medications.join(', ');
    const message = `Hi ${patientName}, your prescription for ${meds} is ready for pickup at our pharmacy. Please bring a valid ID.`;
    return this.sendSMS(patientPhone, message);
  }

  async sendPaymentReminder(
    patientPhone: string, 
    patientName: string, 
    amount: number, 
    dueDate: string
  ): Promise<SMSResult> {
    const message = `Hi ${patientName}, you have an outstanding balance of $${amount.toFixed(2)} due on ${dueDate}. Please make payment at your earliest convenience.`;
    return this.sendSMS(patientPhone, message);
  }

  async sendVerificationCode(
    phone: string, 
    code: string
  ): Promise<SMSResult> {
    const message = `Your verification code is: ${code}. This code will expire in 10 minutes.`;
    return this.sendSMS(phone, message);
  }

  async sendEmergencyAlert(
    phone: string, 
    facilityName: string, 
    alertType: string
  ): Promise<SMSResult> {
    const message = `EMERGENCY ALERT from ${facilityName}: ${alertType}. Please respond immediately if you are available.`;
    return this.sendSMS(phone, message);
  }

  getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const smsService = new SMSService();