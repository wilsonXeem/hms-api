import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// User Preferences
router.get('/preferences', settingsController.getUserPreferences);
router.put('/preferences', [
  body('theme').isIn(['light', 'dark']).optional(),
  body('language').isString().optional(),
  body('timezone').isString().optional(),
  body('dateFormat').isString().optional(),
  body('timeFormat').isIn(['12h', '24h']).optional(),
  body('autoLogout').isInt({ min: 0 }).optional(),
  body('showPatientPhotos').isBoolean().optional(),
  body('compactView').isBoolean().optional(),
  validateRequest
], settingsController.updateUserPreferences);

// Notification Settings
router.get('/notifications', settingsController.getNotificationSettings);
router.put('/notifications', [
  body('email').isObject().optional(),
  body('sms').isObject().optional(),
  body('push').isObject().optional(),
  validateRequest
], settingsController.updateNotificationSettings);

// Security Settings
router.get('/security', settingsController.getSecuritySettings);
router.put('/security', [
  body('sessionTimeout').isInt({ min: 5, max: 480 }).optional(),
  body('requireReauth').isBoolean().optional(),
  body('logoutOnClose').isBoolean().optional(),
  body('emailOnLogin').isBoolean().optional(),
  body('blockSuspiciousLogin').isBoolean().optional(),
  validateRequest
], settingsController.updateSecuritySettings);

// Facility Settings (Admin only)
router.get('/facility', roleMiddleware(['admin']), settingsController.getFacilitySettings);
router.put('/facility', [
  roleMiddleware(['admin']),
  body('name').isString().optional(),
  body('licenseNumber').isString().optional(),
  body('address').isString().optional(),
  body('phone').isString().optional(),
  body('email').isEmail().optional(),
  body('timezone').isString().optional(),
  body('currency').isString().optional(),
  body('allowOnlineBooking').isBoolean().optional(),
  body('requireInsurance').isBoolean().optional(),
  validateRequest
], settingsController.updateFacilitySettings);

// System Settings (Admin only)
router.get('/system', roleMiddleware(['admin']), settingsController.getSystemSettings);
router.put('/system', [
  roleMiddleware(['admin']),
  body('passwordMinLength').isInt({ min: 6, max: 20 }).optional(),
  body('sessionTimeout').isInt({ min: 5, max: 480 }).optional(),
  body('requireMfa').isBoolean().optional(),
  body('enforcePasswordPolicy').isBoolean().optional(),
  body('backupFrequency').isIn(['daily', 'weekly', 'monthly']).optional(),
  body('dataRetentionDays').isInt({ min: 30 }).optional(),
  body('enableAuditLog').isBoolean().optional(),
  body('autoArchive').isBoolean().optional(),
  body('maxUsers').isInt({ min: 1 }).optional(),
  body('maxFileSize').isInt({ min: 1, max: 100 }).optional(),
  body('apiRateLimit').isInt({ min: 10 }).optional(),
  body('maxConcurrentSessions').isInt({ min: 1 }).optional(),
  body('enableSystemNotifications').isBoolean().optional(),
  body('enableEmailNotifications').isBoolean().optional(),
  body('enableSmsNotifications').isBoolean().optional(),
  body('maintenanceMode').isIn(['off', 'scheduled', 'immediate']).optional(),
  body('maintenanceStartTime').isString().optional(),
  body('maintenanceMessage').isString().optional(),
  validateRequest
], settingsController.updateSystemSettings);

export default router;