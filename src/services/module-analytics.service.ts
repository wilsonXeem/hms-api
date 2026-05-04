import { eq, and, gte, sql } from 'drizzle-orm';
import { db } from '../config/db.config';
import { activityLogs, moduleConfigurations, users } from '../drizzle/schema';

interface ModuleUsage {
  module: string;
  usage_count: number;
  unique_users: number;
  last_used: Date;
}

export class ModuleAnalyticsService {
  static async trackModuleUsage(userId: string, moduleName: string, action: string): Promise<void> {
    await db.insert(activityLogs).values({
      userId,
      action: `${moduleName}:${action}`,
      entityType: 'module',
      entityId: moduleName,
      timestamp: new Date(),
    });
  }

  static async getModuleUsageStats(facilityId: string, days: number = 30): Promise<ModuleUsage[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const usage = await db.select({
      module: sql<string>`SPLIT_PART(${activityLogs.action}, ':', 1)`,
      usage_count: sql<number>`COUNT(*)`,
      unique_users: sql<number>`COUNT(DISTINCT ${activityLogs.userId})`,
      last_used: sql<Date>`MAX(${activityLogs.timestamp})`,
    })
    .from(activityLogs)
    .innerJoin(users, eq(users.id, activityLogs.userId))
    .where(and(
      eq(users.facilityId, facilityId),
      gte(activityLogs.timestamp, startDate),
      sql`${activityLogs.action} LIKE '%:%'`
    ))
    .groupBy(sql`SPLIT_PART(${activityLogs.action}, ':', 1)`);

    return usage;
  }

  static async getUnusedModules(facilityId: string, days: number = 30): Promise<string[]> {
    const enabledModules = await db.select()
      .from(moduleConfigurations)
      .where(and(
        eq(moduleConfigurations.facilityId, facilityId),
        eq(moduleConfigurations.isEnabled, true)
      ));

    const usageStats = await this.getModuleUsageStats(facilityId, days);
    const usedModules = usageStats.map(stat => stat.module);

    return enabledModules
      .map(mod => mod.moduleName)
      .filter(moduleName => !usedModules.includes(moduleName));
  }

  static async generateModuleReport(facilityId: string): Promise<any> {
    const [usage, unused] = await Promise.all([
      this.getModuleUsageStats(facilityId),
      this.getUnusedModules(facilityId),
    ]);

    return {
      total_modules: usage.length + unused.length,
      active_modules: usage.length,
      unused_modules: unused,
      usage_stats: usage,
      recommendations: this.generateRecommendations(usage, unused),
    };
  }

  private static generateRecommendations(usage: ModuleUsage[], unused: string[]): string[] {
    const recommendations: string[] = [];

    if (unused.length > 0) {
      recommendations.push(`Consider disabling ${unused.length} unused modules: ${unused.join(', ')}`);
    }

    const lowUsage = usage.filter(u => u.usage_count < 10);
    if (lowUsage.length > 0) {
      recommendations.push(`${lowUsage.length} modules have low usage and may need training or review`);
    }

    return recommendations;
  }
}