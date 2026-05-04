import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../config/db.config';
import { facilities, moduleConfigurations } from '../drizzle/schema';
import { errorResponse } from '../utils/response.util';

declare global {
  namespace Express {
    interface Request {
      facilityId?: string;
      facility?: any;
      enabledModules?: string[];
    }
  }
}

export const addFacilityContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user?.facilityId) {
      return errorResponse(res, 'No facility associated with user', undefined, 403);
    }

    req.facilityId = user.facilityId;
    
    // Get facility details
    const [facility] = await db.select().from(facilities).where(eq(facilities.id, user.facilityId)).limit(1);
    if (!facility) {
      return errorResponse(res, 'Facility not found', undefined, 404);
    }

    req.facility = facility;
    
    // Get enabled modules
    const modules = await db.select().from(moduleConfigurations)
      .where(eq(moduleConfigurations.facilityId, user.facilityId));
    
    req.enabledModules = modules.filter(m => m.isEnabled).map(m => m.moduleName);
    
    next();
  } catch (error) {
    next(error);
  }
};

export const checkModuleAccess = (moduleName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.enabledModules?.includes(moduleName)) {
      return errorResponse(res, `Module '${moduleName}' not enabled for this facility`, undefined, 403);
    }
    next();
  };
};

// Backward compatibility alias
export const facilityMiddleware = addFacilityContext;