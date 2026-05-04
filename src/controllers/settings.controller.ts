import { Request, Response } from 'express';
import { db } from '../drizzle/schema';
import { users } from '../models/users.model';
import { tenants } from '../models/tenants.model';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse } from '../utils/response.util';

export class SettingsController {
  // User Preferences
  async getUserPreferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'User not authenticated', undefined, 401);
      }
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (!user[0]) {
        return errorResponse(res, 'User not found', undefined, 404);
      }

      const preferences = user[0].preferences || {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'MM/dd/yyyy',
        timeFormat: '12h',
        autoLogout: 30,
        showPatientPhotos: true,
        compactView: false
      };

      return successResponse(res, 'User preferences retrieved', preferences);
    } catch (error) {
      return errorResponse(res, 'Failed to get preferences');
    }
  }

  async updateUserPreferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'User not authenticated', undefined, 401);
      }
      const preferences = req.body;

      await db.update(users)
        .set({ preferences })
        .where(eq(users.id, userId));

      return successResponse(res, 'Preferences updated successfully', {});
    } catch (error) {
      return errorResponse(res, 'Failed to update preferences');
    }
  }

  // Notification Settings
  async getNotificationSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'User not authenticated', undefined, 401);
      }
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (!user[0]) {
        return errorResponse(res, 'User not found', undefined, 404);
      }

      const settings = user[0].notificationSettings || {
        email: {
          appointments: true,
          labResults: true,
          prescriptions: true,
          systemAlerts: true,
          marketing: false
        },
        sms: {
          appointments: false,
          emergencyAlerts: true,
          prescriptionReminders: false
        },
        push: {
          enabled: true,
          appointments: true,
          messages: true,
          alerts: true
        }
      };

      return successResponse(res, 'Notification settings retrieved', settings);
    } catch (error) {
      return errorResponse(res, 'Failed to get notification settings');
    }
  }

  async updateNotificationSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'User not authenticated', undefined, 401);
      }
      const settings = req.body;

      await db.update(users)
        .set({ notificationSettings: settings })
        .where(eq(users.id, userId));

      return successResponse(res, 'Notification settings updated successfully', {});
    } catch (error) {
      return errorResponse(res, 'Failed to update notification settings');
    }
  }

  // Security Settings
  async getSecuritySettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'User not authenticated', undefined, 401);
      }
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (!user[0]) {
        return errorResponse(res, 'User not found', undefined, 404);
      }

      const settings = user[0].securitySettings || {
        sessionTimeout: 30,
        requireReauth: true,
        logoutOnClose: false,
        emailOnLogin: true,
        blockSuspiciousLogin: true
      };

      return successResponse(res, 'Security settings retrieved', settings);
    } catch (error) {
      return errorResponse(res, 'Failed to get security settings');
    }
  }

  async updateSecuritySettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'User not authenticated', undefined, 401);
      }
      const settings = req.body;

      await db.update(users)
        .set({ securitySettings: settings })
        .where(eq(users.id, userId));

      return successResponse(res, 'Security settings updated successfully', {});
    } catch (error) {
      return errorResponse(res, 'Failed to update security settings');
    }
  }

  // Facility Settings (Admin only)
  async getFacilitySettings(req: Request, res: Response) {
    try {
      const facilityId = req.user?.facilityId;
      if (!facilityId) {
        return errorResponse(res, 'Facility not found', undefined, 404);
      }
      const tenant = await db.select().from(tenants).where(eq(tenants.id, facilityId)).limit(1);
      
      if (!tenant[0]) {
        return errorResponse(res, 'Facility not found', undefined, 404);
      }

      const settings = tenant[0].facilitySettings || {
        name: '',
        licenseNumber: '',
        address: '',
        phone: '',
        email: '',
        timezone: 'UTC',
        currency: 'USD',
        allowOnlineBooking: true,
        requireInsurance: false,
        operatingHours: {
          monday: { open: '09:00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false },
          thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false },
          saturday: { open: '09:00', close: '12:00', closed: false },
          sunday: { open: '', close: '', closed: true }
        }
      };

      return successResponse(res, 'Facility settings retrieved', settings);
    } catch (error) {
      return errorResponse(res, 'Failed to get facility settings');
    }
  }

  async updateFacilitySettings(req: Request, res: Response) {
    try {
      const facilityId = req.user?.facilityId;
      if (!facilityId) {
        return errorResponse(res, 'Facility not found', undefined, 404);
      }
      const settings = req.body;

      await db.update(tenants)
        .set({ facilitySettings: settings })
        .where(eq(tenants.id, facilityId));

      return successResponse(res, 'Facility settings updated successfully', {});
    } catch (error) {
      return errorResponse(res, 'Failed to update facility settings');
    }
  }

  // System Settings (Admin only)
  async getSystemSettings(req: Request, res: Response) {
    try {
      const facilityId = req.user?.facilityId;
      if (!facilityId) {
        return errorResponse(res, 'Facility not found', undefined, 404);
      }
      const tenant = await db.select().from(tenants).where(eq(tenants.id, facilityId)).limit(1);
      
      if (!tenant[0]) {
        return errorResponse(res, 'Tenant not found', undefined, 404);
      }

      const settings = tenant[0].systemSettings || {
        passwordMinLength: 8,
        sessionTimeout: 30,
        requireMfa: false,
        enforcePasswordPolicy: true,
        backupFrequency: 'daily',
        dataRetentionDays: 365,
        enableAuditLog: true,
        autoArchive: false,
        maxUsers: 100,
        maxFileSize: 10,
        apiRateLimit: 100,
        maxConcurrentSessions: 3,
        enableSystemNotifications: true,
        enableEmailNotifications: true,
        enableSmsNotifications: false,
        maintenanceMode: 'off',
        maintenanceStartTime: '',
        maintenanceMessage: 'System will be under maintenance. Please try again later.'
      };

      return successResponse(res, 'System settings retrieved', settings);
    } catch (error) {
      return errorResponse(res, 'Failed to get system settings');
    }
  }

  async updateSystemSettings(req: Request, res: Response) {
    try {
      const facilityId = req.user?.facilityId;
      if (!facilityId) {
        return errorResponse(res, 'Facility not found', undefined, 404);
      }
      const settings = req.body;

      await db.update(tenants)
        .set({ systemSettings: settings })
        .where(eq(tenants.id, facilityId));

      return successResponse(res, 'System settings updated successfully', {});
    } catch (error) {
      return errorResponse(res, 'Failed to update system settings');
    }
  }
}

export const settingsController = new SettingsController();