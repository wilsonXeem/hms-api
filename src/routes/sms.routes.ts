import { Router } from 'express';
import { SMSController } from '../controllers/sms.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { validationMiddleware } from '../middleware/validation.middleware';
import { body } from 'express-validator';

const router = Router();

// SMS validation schemas
const sendSMSValidation = [
  body('to').isMobilePhone('any' as any).withMessage('Valid phone number is required'),
  body('message').isLength({ min: 1, max: 160 }).withMessage('Message must be 1-160 characters'),
  body('provider').optional().isIn(['twilio', 'aws-sns']).withMessage('Invalid SMS provider')
];

const appointmentReminderValidation = [
  body('patientPhone').isMobilePhone('any' as any).withMessage('Valid patient phone number is required'),
  body('patientName').isLength({ min: 1 }).withMessage('Patient name is required'),
  body('doctorName').isLength({ min: 1 }).withMessage('Doctor name is required'),
  body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'),
  body('appointmentTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid appointment time is required')
];

const labResultsValidation = [
  body('patientPhone').isMobilePhone('any' as any).withMessage('Valid patient phone number is required'),
  body('patientName').isLength({ min: 1 }).withMessage('Patient name is required'),
  body('testNames').isArray({ min: 1 }).withMessage('Test names array is required')
];

const criticalAlertValidation = [
  body('doctorPhone').isMobilePhone('any' as any).withMessage('Valid doctor phone number is required'),
  body('patientName').isLength({ min: 1 }).withMessage('Patient name is required'),
  body('alertMessage').isLength({ min: 1 }).withMessage('Alert message is required')
];

const prescriptionValidation = [
  body('patientPhone').isMobilePhone('any' as any).withMessage('Valid patient phone number is required'),
  body('patientName').isLength({ min: 1 }).withMessage('Patient name is required'),
  body('medications').isArray({ min: 1 }).withMessage('Medications array is required')
];

const paymentReminderValidation = [
  body('patientPhone').isMobilePhone('any' as any).withMessage('Valid patient phone number is required'),
  body('patientName').isLength({ min: 1 }).withMessage('Patient name is required'),
  body('amount').isNumeric().withMessage('Valid amount is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required')
];

const verificationCodeValidation = [
  body('phone').isMobilePhone('any' as any).withMessage('Valid phone number is required'),
  body('code').isLength({ min: 4, max: 8 }).withMessage('Verification code must be 4-8 characters')
];

const emergencyAlertValidation = [
  body('phone').isMobilePhone('any' as any).withMessage('Valid phone number is required'),
  body('facilityName').isLength({ min: 1 }).withMessage('Facility name is required'),
  body('alertType').isLength({ min: 1 }).withMessage('Alert type is required')
];

// Routes
router.post('/send', 
  authMiddleware, 
  roleMiddleware(['admin', 'doctor', 'nurse', 'receptionist']),
  sendSMSValidation,
  validationMiddleware,
  SMSController.sendSMS
);

router.post('/appointment-reminder', 
  authMiddleware, 
  roleMiddleware(['admin', 'doctor', 'nurse', 'receptionist']),
  appointmentReminderValidation,
  validationMiddleware,
  SMSController.sendAppointmentReminder
);

router.post('/lab-results', 
  authMiddleware, 
  roleMiddleware(['admin', 'doctor', 'lab_tech']),
  labResultsValidation,
  validationMiddleware,
  SMSController.sendLabResultsNotification
);

router.post('/critical-alert', 
  authMiddleware, 
  roleMiddleware(['admin', 'doctor', 'nurse', 'lab_tech']),
  criticalAlertValidation,
  validationMiddleware,
  SMSController.sendCriticalAlert
);

router.post('/prescription-ready', 
  authMiddleware, 
  roleMiddleware(['admin', 'pharmacist']),
  prescriptionValidation,
  validationMiddleware,
  SMSController.sendPrescriptionNotification
);

router.post('/payment-reminder', 
  authMiddleware, 
  roleMiddleware(['admin', 'billing']),
  paymentReminderValidation,
  validationMiddleware,
  SMSController.sendPaymentReminder
);

router.post('/verification-code', 
  verificationCodeValidation,
  validationMiddleware,
  SMSController.sendVerificationCode
);

router.post('/emergency-alert', 
  authMiddleware, 
  roleMiddleware(['admin', 'doctor']),
  emergencyAlertValidation,
  validationMiddleware,
  SMSController.sendEmergencyAlert
);

router.get('/providers', 
  authMiddleware, 
  roleMiddleware(['admin']),
  SMSController.getSupportedProviders
);

export default router;