import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { successResponse, errorResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';
import { invalidateModuleCache } from '../middleware/hospital.middleware';
import { 
  createUserSchema, 
  updateUserSchema, 
  createRoleSchema, 
  updateRoleSchema,
  createFacilitySchema,
  updateFacilitySchema,
  facilitySettingsSchema
} from '../schemas/validation.schemas';

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const { search, limit = 50, offset = 0 } = req.query;

    const users = await AdminService.getUsers(
      facilityId,
      search as string,
      Number(limit),
      Number(offset)
    );

    successResponse(res, 'Users retrieved successfully', { users });
  } catch (error) {
    logger.error('Get users error:', error);
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const validatedData = createUserSchema.parse(req.body);

    const newUser = await AdminService.createUser(facilityId, validatedData);
    
    if (!newUser) {
      return errorResponse(res, 'Failed to create user', undefined, 500);
    }
    
    logger.info(`User created: ${newUser.email} at facility ${facilityId}`);
    return successResponse(res, 'User created successfully', { user: newUser }, 201);
  } catch (error) {
    logger.error('Create user error:', error);
    return next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const { id } = req.params;
    const validatedData = updateUserSchema.parse(req.body);

    const updatedUser = await AdminService.updateUser(facilityId, id, validatedData);
    
    if (!updatedUser) {
      return errorResponse(res, 'User not found', undefined, 404);
    }

    logger.info(`User updated: ${id} at facility ${facilityId}`);
    return successResponse(res, 'User updated successfully', { user: updatedUser });
  } catch (error) {
    logger.error('Update user error:', error);
    return next(error);
  }
};

export const deactivateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const { id } = req.params;

    const user = await AdminService.deactivateUser(facilityId, id);
    
    if (!user) {
      return errorResponse(res, 'User not found', undefined, 404);
    }

    logger.info(`User deactivated: ${id} at facility ${facilityId}`);
    return successResponse(res, 'User deactivated successfully');
  } catch (error) {
    logger.error('Deactivate user error:', error);
    return next(error);
  }
};

export const getFacilitySettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    
    const settings = await AdminService.getFacilitySettings(facilityId);
    
    if (!settings) {
      return errorResponse(res, 'Facility not found', undefined, 404);
    }

    successResponse(res, 'Facility settings retrieved', { settings });
  } catch (error) {
    logger.error('Get facility settings error:', error);
    next(error);
  }
};

export const updateFacilitySettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const validatedData = facilitySettingsSchema.parse(req.body);

    const updated = await AdminService.updateFacilitySettings(facilityId, validatedData);
    
    logger.info(`Facility settings updated: ${facilityId}`);
    successResponse(res, 'Facility settings updated', { settings: updated });
  } catch (error) {
    logger.error('Update facility settings error:', error);
    next(error);
  }
};

export const getActivityLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const { limit = 100, offset = 0 } = req.query;

    const logs = await AdminService.getActivityLogs(
      facilityId,
      Number(limit),
      Number(offset)
    );

    successResponse(res, 'Activity logs retrieved', { logs });
  } catch (error) {
    logger.error('Get activity logs error:', error);
    next(error);
  }
};

export const getSystemStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    
    const stats = await AdminService.getSystemStats(facilityId);

    successResponse(res, 'System stats retrieved', { stats });
  } catch (error) {
    logger.error('Get system stats error:', error);
    next(error);
  }
};

export const getOperationsSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const operations = await AdminService.getOperationsSummary(facilityId);

    successResponse(res, 'Operations summary retrieved', { operations });
  } catch (error) {
    logger.error('Get operations summary error:', error);
    next(error);
  }
};

export const getRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    
    const roles = await AdminService.getRoles(facilityId);

    successResponse(res, 'Roles retrieved successfully', { roles });
  } catch (error) {
    logger.error('Get roles error:', error);
    next(error);
  }
};

export const createRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const validatedData = createRoleSchema.parse(req.body);

    const newRole = await AdminService.createRole(facilityId, validatedData);
    
    if (!newRole) {
      return errorResponse(res, 'Failed to create role', undefined, 500);
    }
    
    logger.info(`Role created: ${newRole.name} at facility ${facilityId}`);
    return successResponse(res, 'Role created successfully', { role: newRole }, 201);
  } catch (error) {
    logger.error('Create role error:', error);
    return next(error);
  }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const { id } = req.params;
    const validatedData = updateRoleSchema.parse(req.body);

    const updatedRole = await AdminService.updateRole(facilityId, id, validatedData);
    
    if (!updatedRole) {
      return errorResponse(res, 'Role not found', undefined, 404);
    }

    logger.info(`Role updated: ${id} at facility ${facilityId}`);
    return successResponse(res, 'Role updated successfully', { role: updatedRole });
  } catch (error) {
    logger.error('Update role error:', error);
    return next(error);
  }
};

export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const { id } = req.params;

    const deleted = await AdminService.deleteRole(facilityId, id);
    
    if (!deleted) {
      return errorResponse(res, 'Role not found or cannot be deleted', undefined, 404);
    }

    logger.info(`Role deleted: ${id} at facility ${facilityId}`);
    return successResponse(res, 'Role deleted successfully');
  } catch (error) {
    logger.error('Delete role error:', error);
    return next(error);
  }
};

export const getFacilities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilities = await AdminService.getAllFacilities();
    successResponse(res, 'Facilities retrieved successfully', { facilities });
  } catch (error) {
    logger.error('Get facilities error:', error);
    next(error);
  }
};

export const createFacility = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createFacilitySchema.parse(req.body);
    const userId = (req as any).user?.id;
    const newFacility = await AdminService.createFacility(validatedData, userId);
    
    if (!newFacility) {
      return errorResponse(res, 'Failed to create facility', undefined, 500);
    }
    
    logger.info(`Facility created: ${newFacility.name}`);
    return successResponse(res, 'Facility created successfully', { facility: newFacility }, 201);
  } catch (error) {
    logger.error('Create facility error:', error);
    return next(error);
  }
};

export const updateFacilityById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = updateFacilitySchema.parse(req.body);
    const userId = (req as any).user?.id;

    const updatedFacility = await AdminService.updateFacilityById(id, validatedData, userId);
    
    if (!updatedFacility) {
      return errorResponse(res, 'Facility not found', undefined, 404);
    }

    logger.info(`Facility updated: ${id}`);
    return successResponse(res, 'Facility updated successfully', { facility: updatedFacility });
  } catch (error) {
    logger.error('Update facility error:', error);
    return next(error);
  }
};

export const deleteFacility = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const deleted = await AdminService.deleteFacility(id, userId);
    
    if (!deleted) {
      return errorResponse(res, 'Facility not found', undefined, 404);
    }

    logger.info(`Facility deleted: ${id}`);
    return successResponse(res, 'Facility deleted successfully');
  } catch (error) {
    logger.error('Delete facility error:', error);
    return next(error);
  }
};

export const createWard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const ward = await AdminService.createWard(facilityId, req.body);
    logger.info(`Ward created: ${ward.name}`);
    successResponse(res, 'Ward created successfully', { ward }, 201);
  } catch (error) {
    logger.error('Create ward error:', error);
    next(error);
  }
};

export const updateWard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const { id } = req.params;
    const ward = await AdminService.updateWard(facilityId, id, req.body);
    if (!ward) return errorResponse(res, 'Ward not found', undefined, 404);
    logger.info(`Ward updated: ${id}`);
    successResponse(res, 'Ward updated successfully', { ward });
  } catch (error) {
    logger.error('Update ward error:', error);
    next(error);
  }
};

export const deleteWard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const { id } = req.params;
    const ward = await AdminService.deleteWard(facilityId, id);
    if (!ward) return errorResponse(res, 'Ward not found', undefined, 404);
    logger.info(`Ward deleted: ${id}`);
    successResponse(res, 'Ward deleted successfully');
  } catch (error) {
    logger.error('Delete ward error:', error);
    next(error);
  }
};

export const getSchedules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const settings = await AdminService.getFacilitySettings(facilityId);
    let schedules: any[] = [];
    if (settings?.operatingHours) {
      const hours = typeof settings.operatingHours === 'string'
        ? JSON.parse(settings.operatingHours)
        : settings.operatingHours;
      schedules = hours?.schedules || [];
    }
    successResponse(res, 'Schedules retrieved', { schedules });
  } catch (error) {
    logger.error('Get schedules error:', error);
    next(error);
  }
};

export const saveSchedules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const { schedules } = req.body;
    const settings = await AdminService.getFacilitySettings(facilityId);
    const existing = settings?.operatingHours
      ? (typeof settings.operatingHours === 'string'
          ? JSON.parse(settings.operatingHours)
          : settings.operatingHours) || {}
      : {};
    await AdminService.updateFacilitySettings(facilityId, {
      operatingHours: { ...existing, schedules }
    });
    logger.info(`Schedules saved for facility ${facilityId}`);
    successResponse(res, 'Schedules saved successfully', { schedules });
  } catch (error) {
    logger.error('Save schedules error:', error);
    next(error);
  }
};

export const toggleModule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const { name, enabled } = req.body;
    const updated = await AdminService.updateModuleConfig(facilityId, name, !!enabled);
    if (!updated) return errorResponse(res, 'Module not found', undefined, 404);
    invalidateModuleCache(); // force cache refresh on next request
    logger.info(`Module ${name} set to ${enabled} for facility ${facilityId}`);
    successResponse(res, 'Module updated', { module: updated });
  } catch (error) {
    logger.error('Toggle module error:', error);
    next(error);
  }
};

export const getNotificationSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const settings = await AdminService.getFacilitySettings(facilityId);
    const hours = settings?.operatingHours
      ? (typeof settings.operatingHours === 'string' ? JSON.parse(settings.operatingHours) : settings.operatingHours) || {}
      : {};
    const notificationSettings = hours.notifications || {
      smsProvider: 'Disabled', emailProvider: 'SMTP',
      appointmentReminders: true, labResultAlerts: true,
      lowStockAlerts: true, paymentReminders: true
    };
    successResponse(res, 'Notification settings retrieved', { notificationSettings });
  } catch (error) {
    logger.error('Get notification settings error:', error);
    next(error);
  }
};

export const saveNotificationSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const { notificationSettings } = req.body;
    const settings = await AdminService.getFacilitySettings(facilityId);
    const existing = settings?.operatingHours
      ? (typeof settings.operatingHours === 'string' ? JSON.parse(settings.operatingHours) : settings.operatingHours) || {}
      : {};
    await AdminService.updateFacilitySettings(facilityId, {
      operatingHours: { ...existing, notifications: notificationSettings }
    });
    logger.info(`Notification settings saved for facility ${facilityId}`);
    successResponse(res, 'Notification settings saved', { notificationSettings });
  } catch (error) {
    logger.error('Save notification settings error:', error);
    next(error);
  }
};
