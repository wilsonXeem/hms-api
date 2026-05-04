import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache.service';
import { logger } from '../utils/logger.util';

interface SmartCacheOptions {
  ttl: number;
  varyBy?: string[];
  skipIf?: (req: Request) => boolean;
  invalidateOn?: string[];
}

export const smartCache = (options: SmartCacheOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    if (options.skipIf && options.skipIf(req)) {
      return next();
    }

    // Generate cache key with vary parameters
    const varyParams = options.varyBy?.map(param => 
      req.headers[param] || req.query[param] || req.params[param]
    ).join(':') || '';
    
    const cacheKey = `${req.route?.path || req.path}:${varyParams}:${JSON.stringify(req.query)}`;

    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }
    } catch (error) {
      logger.warn('Cache read error:', error);
    }

    // Intercept response
    const originalJson = res.json;
    res.json = function(data: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.set(cacheKey, data, options.ttl).catch(err => 
          logger.warn('Cache write error:', err)
        );
        res.setHeader('X-Cache', 'MISS');
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

// Predefined cache strategies
export const cacheStrategies = {
  // Fast-changing data (2 minutes)
  dynamic: { ttl: 2 * 60 * 1000 },
  
  // Medium-changing data (10 minutes)
  standard: { ttl: 10 * 60 * 1000 },
  
  // Slow-changing data (1 hour)
  static: { ttl: 60 * 60 * 1000 },
  
  // User-specific data
  userSpecific: {
    ttl: 5 * 60 * 1000,
    varyBy: ['authorization']
  },
  
  // Facility-specific data
  facilitySpecific: {
    ttl: 15 * 60 * 1000,
    varyBy: ['x-facility-id']
  }
};