import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { db } from '../config/db.config';
import { admissions } from '../models/admissions.model';
import { beds } from '../models/beds.model';
import { wards } from '../models/wards.model';
import { logger } from '../utils/logger.util';

export interface PatientFlowStats {
  totalAdmissions: number;
  activeAdmissions: number;
  todayAdmissions: number;
  todayDischarges: number;
  averageLengthOfStay: number;
  bedOccupancyRate: number;
  admissionsByType: Record<string, number>;
}

export class PatientFlowAnalyticsService {
  static async getBasicFlowStats(facilityId: string): Promise<PatientFlowStats> {
    try {
      // Get basic admission counts
      const [totalAdmissions] = await db.select({ count: sql<number>`count(*)` })
        .from(admissions)
        .where(eq(admissions.facilityId, facilityId));

      const [activeAdmissions] = await db.select({ count: sql<number>`count(*)` })
        .from(admissions)
        .where(and(
          eq(admissions.facilityId, facilityId),
          eq(admissions.status, 'admitted')
        ));

      const [todayAdmissions] = await db.select({ count: sql<number>`count(*)` })
        .from(admissions)
        .where(and(
          eq(admissions.facilityId, facilityId),
          sql`DATE(${admissions.admissionDate}) = CURRENT_DATE`
        ));

      const [todayDischarges] = await db.select({ count: sql<number>`count(*)` })
        .from(admissions)
        .where(and(
          eq(admissions.facilityId, facilityId),
          sql`DATE(${admissions.dischargeDate}) = CURRENT_DATE`
        ));

      // Calculate average length of stay (discharged patients only)
      const [avgLOS] = await db.select({
        avg: sql<number>`AVG(EXTRACT(DAY FROM (${admissions.dischargeDate} - ${admissions.admissionDate})))`
      })
      .from(admissions)
      .where(and(
        eq(admissions.facilityId, facilityId),
        eq(admissions.status, 'discharged')
      ));

      // Get bed occupancy rate
      const [totalBeds] = await db.select({ count: sql<number>`count(*)` })
        .from(beds)
        .where(eq(beds.facilityId, facilityId));

      const [occupiedBeds] = await db.select({ count: sql<number>`count(*)` })
        .from(beds)
        .where(and(
          eq(beds.facilityId, facilityId),
          eq(beds.isOccupied, true)
        ));

      const bedOccupancyRate = totalBeds.count > 0 
        ? (occupiedBeds.count / totalBeds.count) * 100 
        : 0;

      // Get admissions by type
      const admissionsByTypeResult = await db.select({
        type: admissions.admissionType,
        count: sql<number>`count(*)`
      })
      .from(admissions)
      .where(eq(admissions.facilityId, facilityId))
      .groupBy(admissions.admissionType);

      const admissionsByType = admissionsByTypeResult.reduce((acc, item) => {
        acc[item.type] = item.count;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalAdmissions: totalAdmissions.count,
        activeAdmissions: activeAdmissions.count,
        todayAdmissions: todayAdmissions.count,
        todayDischarges: todayDischarges.count,
        averageLengthOfStay: Math.round((avgLOS.avg || 0) * 10) / 10,
        bedOccupancyRate: Math.round(bedOccupancyRate * 10) / 10,
        admissionsByType
      };
    } catch (error) {
      logger.error('Get patient flow stats error:', error);
      throw error;
    }
  }

  static async getDailyAdmissionTrend(facilityId: string, days: number = 7) {
    try {
      const result = await db.select({
        date: sql<string>`DATE(${admissions.admissionDate})`,
        admissions: sql<number>`count(*)`
      })
      .from(admissions)
      .where(and(
        eq(admissions.facilityId, facilityId),
        gte(admissions.admissionDate, sql`CURRENT_DATE - INTERVAL '${days} days'`)
      ))
      .groupBy(sql`DATE(${admissions.admissionDate})`)
      .orderBy(sql`DATE(${admissions.admissionDate})`);

      return result;
    } catch (error) {
      logger.error('Get daily admission trend error:', error);
      throw error;
    }
  }

  static async getWardOccupancy(facilityId: string) {
    try {
      const result = await db.select({
        wardId: wards.id,
        wardName: wards.name,
        totalBeds: sql<number>`count(${beds.id})`,
        occupiedBeds: sql<number>`count(CASE WHEN ${beds.isOccupied} = true THEN 1 END)`,
        occupancyRate: sql<number>`ROUND((count(CASE WHEN ${beds.isOccupied} = true THEN 1 END)::float / count(${beds.id}) * 100), 1)`
      })
      .from(wards)
      .leftJoin(beds, eq(beds.wardId, wards.id))
      .where(eq(wards.facilityId, facilityId))
      .groupBy(wards.id, wards.name)
      .orderBy(wards.name);

      return result;
    } catch (error) {
      logger.error('Get ward occupancy error:', error);
      throw error;
    }
  }
}