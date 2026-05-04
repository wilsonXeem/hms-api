import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../config/db.config';
import { tenants, facilities, moduleConfigurations } from '../drizzle/schema';
import { errorResponse } from '../utils/response.util';

declare global {
  namespace Express {
    interface Request {
      tenant?: any;
      tenantId?: string;
      facilityId?: string;
      allowedModules?: string[];
    }
  }
}

export const addTenantContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract tenant from subdomain or custom domain
    const host = req.get('host') || '';
    const subdomain = host.split('.')[0];

    // Try to find tenant by subdomain
    let [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.subdomain, subdomain))
      .limit(1);

    // Try custom domain
    if (!tenant) {
      const [customTenant] = await db.select()
        .from(tenants)
        .where(eq(tenants.customDomain, host))
        .limit(1);
      if (customTenant) tenant = customTenant;
    }

    // Fallback for localhost / development — use the first active tenant
    if (!tenant) {
      const [fallbackTenant] = await db.select()
        .from(tenants)
        .where(eq(tenants.isActive, true))
        .limit(1);
      if (fallbackTenant) tenant = fallbackTenant;
    }

    if (!tenant) {
      return errorResponse(res, 'Tenant not found', undefined, 404);
    }

    if (!tenant.isActive) {
      return errorResponse(res, 'Tenant account is suspended', undefined, 403);
    }

    req.tenant = tenant;
    req.tenantId = tenant.id;
    req.allowedModules = tenant.allowedModules ? JSON.parse(tenant.allowedModules) : [];

    // Get facility for this tenant
    const [facility] = await db.select({ id: facilities.id })
      .from(facilities)
      .where(eq(facilities.tenantId, tenant.id))
      .limit(1);

    if (facility) {
      req.facilityId = facility.id;
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const checkTenantModuleAccess = (moduleName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.allowedModules?.includes(moduleName)) {
      return errorResponse(res, `Module '${moduleName}' not available in your subscription`, undefined, 403);
    }
    next();
  };
};