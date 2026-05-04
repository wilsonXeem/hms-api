import { sql } from 'drizzle-orm';
import { db, readDb } from '../config/db-performance.config';
import { logger } from './logger.util';

// Query optimization utilities
export class QueryOptimizer {
  // Use read replica for read operations
  static getReadConnection() {
    return readDb;
  }

  // Use write connection for write operations
  static getWriteConnection() {
    return db;
  }

  // Batch operations for better performance
  static async batchInsert<T>(
    table: any,
    data: T[],
    batchSize: number = 100
  ): Promise<void> {
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await db.insert(table).values(batch);
    }
    
    logger.info(`Batch inserted ${data.length} records in ${batches.length} batches`);
  }

  // Optimized pagination
  static getPaginationParams(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    const safeLimit = Math.min(limit, 100); // Max 100 items per page
    
    return {
      limit: safeLimit,
      offset: Math.max(0, offset)
    };
  }

  // Connection health check
  static async checkConnectionHealth(): Promise<boolean> {
    try {
      await db.execute(sql`SELECT 1`);
      return true;
    } catch (error) {
      logger.error('Database connection health check failed:', error);
      return false;
    }
  }
}

// Database performance monitoring
export const dbPerformanceMonitor = {
  slowQueryThreshold: 1000, // 1 second
  
  async logSlowQuery(queryName: string, duration: number, query?: string) {
    if (duration > this.slowQueryThreshold) {
      logger.warn(`Slow query detected: ${queryName}`, {
        duration: `${duration}ms`,
        query: query?.substring(0, 200) + '...'
      });
    }
  },

  async trackQueryMetrics(queryName: string, operation: () => Promise<any>) {
    const start = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - start;
      
      await this.logSlowQuery(queryName, duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error(`Query failed: ${queryName}`, {
        duration: `${duration}ms`,
        error: error.message
      });
      throw error;
    }
  }
};
