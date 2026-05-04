import { logger } from '../utils/logger.util';
import { cacheService } from './cache.service';
import { QueryOptimizer } from '../utils/db-optimization.util';

interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  slowQueries: number;
  cacheHitRate: number;
  errorRate: number;
  activeConnections: number;
}

class PerformanceService {
  private metrics: PerformanceMetrics = {
    requestCount: 0,
    averageResponseTime: 0,
    slowQueries: 0,
    cacheHitRate: 0,
    errorRate: 0,
    activeConnections: 0
  };

  private responseTimes: number[] = [];
  private readonly maxResponseTimeHistory = 1000;

  recordRequest(responseTime: number, isError: boolean = false) {
    this.metrics.requestCount++;
    
    // Track response times
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift();
    }
    
    // Update average response time
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    
    // Track slow queries
    if (responseTime > 1000) {
      this.metrics.slowQueries++;
    }
    
    // Track errors
    if (isError) {
      this.metrics.errorRate = 
        (this.metrics.errorRate * (this.metrics.requestCount - 1) + 1) / this.metrics.requestCount;
    }
  }

  async getMetrics(): Promise<PerformanceMetrics> {
    // Update cache hit rate
    const cacheStats = await cacheService.getStats();
    
    // Check database health
    const dbHealthy = await QueryOptimizer.checkConnectionHealth();
    
    return {
      ...this.metrics,
      cacheHitRate: this.calculateCacheHitRate(),
      activeConnections: dbHealthy ? 1 : 0
    };
  }

  private calculateCacheHitRate(): number {
    // This would need to be implemented based on actual cache hit/miss tracking
    return 0.85; // Placeholder
  }

  async getHealthStatus() {
    const metrics = await this.getMetrics();
    
    const health = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      checks: {
        database: await QueryOptimizer.checkConnectionHealth(),
        averageResponseTime: metrics.averageResponseTime < 500,
        errorRate: metrics.errorRate < 0.05,
        cacheHitRate: metrics.cacheHitRate > 0.7
      },
      metrics
    };

    // Determine overall health
    const failedChecks = Object.values(health.checks).filter(check => !check).length;
    if (failedChecks === 0) {
      health.status = 'healthy';
    } else if (failedChecks <= 2) {
      health.status = 'degraded';
    } else {
      health.status = 'unhealthy';
    }

    return health;
  }

  reset() {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      slowQueries: 0,
      cacheHitRate: 0,
      errorRate: 0,
      activeConnections: 0
    };
    this.responseTimes = [];
  }
}

export const performanceService = new PerformanceService();

// Performance monitoring middleware
export const performanceMonitoring = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const isError = res.statusCode >= 400;
    
    performanceService.recordRequest(duration, isError);
    
    if (duration > 1000) {
      logger.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  next();
};