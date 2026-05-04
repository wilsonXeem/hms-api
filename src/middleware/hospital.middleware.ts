import { Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../config/db.config';
import { facilities } from '../models/facilities.model';
import { moduleConfigurations } from '../models/module-configurations.model';
import { logger } from '../utils/logger.util';
import { errorResponse } from '../utils/response.util';

// ── Facility ID cache ──────────────────────────────────────────────────────
let cachedFacilityId: string | null = null;

// ── Module config cache ────────────────────────────────────────────────────
// Map of moduleName -> isEnabled, refreshed every 60 seconds
let moduleCache: Map<string, boolean> = new Map();
let moduleCacheLoadedAt = 0;
const MODULE_CACHE_TTL = 60 * 1000; // 60 seconds

const loadModuleCache = async (facilityId: string): Promise<void> => {
  try {
    const rows = await db.select({
      moduleName: moduleConfigurations.moduleName,
      isEnabled: moduleConfigurations.isEnabled,
    })
      .from(moduleConfigurations)
      .where(eq(moduleConfigurations.facilityId, facilityId));

    moduleCache = new Map(rows.map(r => [r.moduleName, !!r.isEnabled]));
    moduleCacheLoadedAt = Date.now();
    logger.info(`📦 Module cache loaded: ${moduleCache.size} modules`);
  } catch (error) {
    logger.error('Failed to load module cache:', error);
  }
};

// ── Startup loader ─────────────────────────────────────────────────────────
export const loadFacilityId = async (): Promise<void> => {
  try {
    const [facility] = await db.select({ id: facilities.id })
      .from(facilities)
      .where(eq(facilities.isActive, true))
      .limit(1);

    if (facility) {
      cachedFacilityId = facility.id;
      logger.info(`🏥 Hospital facility loaded: ${facility.id}`);
      await loadModuleCache(facility.id);
    } else {
      logger.warn('⚠️  No active facility found in database');
    }
  } catch (error) {
    logger.error('Failed to load facility ID:', error);
  }
};

// ── hospitalContext — stamps req.facilityId on every request ───────────────
export const hospitalContext = (req: Request, res: Response, next: NextFunction) => {
  if (cachedFacilityId) {
    req.facilityId = cachedFacilityId;
  }
  next();
};

// ── requireModule — blocks route if module is disabled ────────────────────
export const requireModule = (moduleName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Refresh cache if stale
    if (cachedFacilityId && Date.now() - moduleCacheLoadedAt > MODULE_CACHE_TTL) {
      await loadModuleCache(cachedFacilityId);
    }

    const isEnabled = moduleCache.get(moduleName);

    // If module not found in cache at all, allow through (fail open)
    if (isEnabled === undefined) {
      return next();
    }

    if (!isEnabled) {
      return errorResponse(
        res,
        `The ${moduleName} module is currently disabled. Contact your administrator.`,
        undefined,
        403
      );
    }

    next();
  };
};

// ── invalidateModuleCache — call after toggling a module ──────────────────
export const invalidateModuleCache = (): void => {
  moduleCacheLoadedAt = 0;
};
