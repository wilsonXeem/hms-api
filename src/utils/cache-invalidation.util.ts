import { cacheService } from '../services/cache.service';
import { logger } from './logger.util';

export class CacheInvalidator {
  static async invalidatePatient(patientId: string) {
    const patterns = [
      `patients:${patientId}`,
      `patients:list:*`,
      `/api/patients/${patientId}:*`,
      `/api/patients:*`
    ];
    await this.invalidatePatterns(patterns);
  }

  static async invalidateInventory() {
    const patterns = [
      `inventory:*`,
      `/api/inventory/*`
    ];
    await this.invalidatePatterns(patterns);
  }

  static async invalidateLab(patientId?: string) {
    const patterns = [
      `lab:*`,
      `/api/lab/*`,
      ...(patientId ? [`lab:${patientId}`] : [])
    ];
    await this.invalidatePatterns(patterns);
  }

  static async invalidateReports() {
    const patterns = [
      `reports:*`,
      `/api/report/*`
    ];
    await this.invalidatePatterns(patterns);
  }

  private static async invalidatePatterns(patterns: string[]) {
    try {
      for (const pattern of patterns) {
        await cacheService.delete(pattern);
      }
      logger.debug(`Cache invalidated for patterns: ${patterns.join(', ')}`);
    } catch (error) {
      logger.warn('Cache invalidation failed:', error);
    }
  }
}