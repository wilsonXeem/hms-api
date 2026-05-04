import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis.config';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyPrefix?: string;
  skipCache?: boolean;
}

export const cache = (options: CacheOptions = {}) => {
  const { ttl = 300, keyPrefix = 'hms', skipCache = false } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (skipCache || req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${keyPrefix}:${req.originalUrl}:${JSON.stringify(req.query)}`;

    try {
      // Check if Redis is available
      if (!redisClient.isOpen) {
        return next();
      }

      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // Store original res.json
      const originalJson = res.json;
      
      res.json = function(data: any) {
        // Cache successful responses
        if (res.statusCode === 200) {
          redisClient.setEx(cacheKey, ttl, JSON.stringify(data)).catch(console.error);
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      // If Redis fails, continue without caching
      next();
    }
  };
};

export const invalidateCache = (pattern: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      if (res.statusCode < 400) {
        // Invalidate cache on successful mutations
        redisClient.keys(`*${pattern}*`).then(keys => {
          if (keys.length > 0) {
            redisClient.del(keys).catch(console.error);
          }
        }).catch(console.error);
      }
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Specific cache configurations
export const patientCache = cache({ ttl: 600, keyPrefix: 'patients' });
export const appointmentCache = cache({ ttl: 300, keyPrefix: 'appointments' });
export const labResultsCache = cache({ ttl: 1800, keyPrefix: 'lab_results' });
export const inventoryCache = cache({ ttl: 900, keyPrefix: 'inventory' });