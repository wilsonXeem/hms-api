import { logger } from '../utils/logger.util';
import { redisClient } from '../config/redis.config';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheService {
  private memoryCache = new Map<string, CacheItem<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxMemoryItems = 1000; // Limit memory cache size

  async set<T>(key: string, data: T, ttl: number = this.defaultTTL): Promise<void> {
    // Try Redis first
    try {
      if (redisClient.isReady) {
        await redisClient.setEx(key, Math.floor(ttl / 1000), JSON.stringify(data));
        logger.debug(`Redis cache set: ${key}`);
        return;
      }
    } catch (error) {
      logger.warn(`Redis cache failed, falling back to memory: ${error}`);
    }

    // Fallback to memory cache with size limit
    if (this.memoryCache.size >= this.maxMemoryItems) {
      this.evictOldest();
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    logger.debug(`Memory cache set: ${key}`);
  }

  async get<T>(key: string): Promise<T | null> {
    // Try Redis first
    try {
      if (redisClient.isReady) {
        const cached = await redisClient.get(key);
        if (cached) {
          logger.debug(`Redis cache hit: ${key}`);
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      logger.warn(`Redis cache read failed: ${error}`);
    }

    // Fallback to memory cache
    const item = this.memoryCache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.memoryCache.delete(key);
      logger.debug(`Memory cache expired: ${key}`);
      return null;
    }

    logger.debug(`Memory cache hit: ${key}`);
    return item.data;
  }

  async delete(key: string): Promise<boolean> {
    let deleted = false;
    
    // Delete from Redis
    try {
      if (redisClient.isReady) {
        await redisClient.del(key);
        deleted = true;
      }
    } catch (error) {
      logger.warn(`Redis cache delete failed: ${error}`);
    }

    // Delete from memory cache
    const memoryDeleted = this.memoryCache.delete(key);
    if (memoryDeleted || deleted) {
      logger.debug(`Cache deleted: ${key}`);
      return true;
    }
    return false;
  }

  async clear(): Promise<void> {
    try {
      if (redisClient.isReady) {
        await redisClient.flushDb();
      }
    } catch (error) {
      logger.warn(`Redis cache clear failed: ${error}`);
    }
    
    this.memoryCache.clear();
    logger.info('Cache cleared');
  }

  has(key: string): boolean {
    const item = this.memoryCache.get(key);
    if (!item) return false;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.memoryCache.delete(key);
      return false;
    }
    return true;
  }

  async getStats() {
    let redisSize = 0;
    try {
      if (redisClient.isReady) {
        redisSize = await redisClient.dbSize();
      }
    } catch (error) {
      logger.warn(`Redis stats failed: ${error}`);
    }

    return {
      memorySize: this.memoryCache.size,
      redisSize,
      memoryKeys: Array.from(this.memoryCache.keys())
    };
  }

  private evictOldest(): void {
    const oldestKey = this.memoryCache.keys().next().value;
    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      logger.debug(`Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.memoryCache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info(`Memory cache cleanup: removed ${cleaned} expired entries`);
    }
  }
}

export const cacheService = new CacheService();

// Auto cleanup every 10 minutes
setInterval(() => {
  cacheService.cleanup();
}, 10 * 60 * 1000);