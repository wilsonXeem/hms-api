import nodemailer from 'nodemailer';
import { config } from '../config/app.config';
import { logger } from './logger.util';

// Simple rate limiting for emails
const emailRateLimit = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_EMAILS_PER_WINDOW = 5;

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    // Rate limiting check
    const now = Date.now();
    const lastSent = emailRateLimit.get(options.to) || 0;
    
    if (now - lastSent < RATE_LIMIT_WINDOW) {
      const emailCount = emailRateLimit.get(`count_${options.to}`) || 0;
      if (emailCount >= MAX_EMAILS_PER_WINDOW) {
        logger.warn(`Email rate limit exceeded for ${options.to}`);
        return false;
      }
      emailRateLimit.set(`count_${options.to}`, emailCount + 1);
    } else {
      emailRateLimit.set(`count_${options.to}`, 1);
      emailRateLimit.set(options.to, now);
    }

    const mailOptions = {
      from: `"Hospital Management System" <${config.email.user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    logger.error('Failed to send email:', error);
    return false;
  }
};

export const sendWelcomeEmail = async (email: string, name: string): Promise<boolean> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">Welcome to Hospital Management System</h2>
      <p>Dear ${name},</p>
      <p>Welcome to our Hospital Management System. Your account has been successfully created.</p>
      <p>You can now access all the features available to your role.</p>
      <p>If you have any questions, please don't hesitate to contact our support team.</p>
      <p>Best regards,<br>Hospital Management Team</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to Hospital Management System',
    html,
  });
};

export const sendPasswordResetEmail = async (email: string, resetToken: string): Promise<boolean> => {
  const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">Password Reset Request</h2>
      <p>You requested a password reset for your Hospital Management System account.</p>
      <p>Click the button below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
      </div>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all;">${resetUrl}</p>
      <p>This link will expire in 1 hour for security reasons.</p>
      <p>If you didn't request this password reset, please ignore this email.</p>
      <p>Best regards,<br>Hospital Management Team</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Password Reset Request',
    html,
  });
};