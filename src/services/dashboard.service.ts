import { db } from '../drizzle/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { 
  patients, 
  appointments, 
  payments, 
  prescriptions, 
  inventoryItems, 
  labRequests, 
  vitals 
} from '../models';

export class DashboardService {
  static async getDashboardByRole(role: string, facilityId: string, userId: string) {
    const [stats, recentActivity, quickStats, revenueData, appointmentTrends, inventoryStatus] = await Promise.all([
      this.getDashboardStats(facilityId),
      this.getRecentActivity(facilityId),
      this.getQuickStats(facilityId),
      this.getRevenueData(facilityId),
      this.getAppointmentTrends(facilityId),
      this.getInventoryStatus(facilityId)
    ]);

    return {
      stats,
      recentActivity,
      quickStats,
      revenueData,
      appointmentTrends,
      inventoryStatus
    };
  }

  static async getGeneralStats(facilityId: string) {
    return await this.getDashboardStats(facilityId);
  }

  static async getDashboardStats(facilityId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    try {
      // Basic counts
      const [
        totalPatients,
        todayAppointments,
        totalRevenue,
        pendingLabs
      ] = await Promise.all([
        db.select({ count: sql<number>`COUNT(*)` }).from(patients).where(eq(patients.facilityId, facilityId)),
        db.select({ count: sql<number>`COUNT(*)` }).from(appointments).where(and(
          eq(appointments.facilityId, facilityId),
          eq(appointments.appointmentDate, todayStr)
        )),
        db.select({ total: sql<number>`COALESCE(SUM(${payments.amount}), 0)` }).from(payments).where(and(
          eq(payments.patientId, patients.id),
          eq(patients.facilityId, facilityId),
          eq(payments.status, 'completed')
        )).leftJoin(patients, eq(payments.patientId, patients.id)),
        db.select({ count: sql<number>`COUNT(*)` }).from(labRequests).where(and(
          eq(labRequests.assignedLabId, facilityId),
          eq(labRequests.status, 'pending')
        ))
      ]);

      return {
        totalPatients: totalPatients[0]?.count || 0,
        todayAppointments: todayAppointments[0]?.count || 0,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingLabs: pendingLabs[0]?.count || 0
      };
    } catch (error) {
      console.error('Dashboard stats error:', error);
      return {
        totalPatients: 0,
        todayAppointments: 0,
        totalRevenue: 0,
        pendingLabs: 0
      };
    }
  }

  static async getRecentActivity(facilityId: string) {
    try {
      const recentActivities = await db.select({
        id: appointments.id,
        patientName: sql<string>`COALESCE(${patients.firstName} || ' ' || ${patients.lastName}, ${appointments.patientName}, 'Unknown')`,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        reason: appointments.reason,
        status: appointments.status,
        createdAt: appointments.createdAt
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .where(eq(appointments.facilityId, facilityId))
      .orderBy(desc(appointments.createdAt))
      .limit(10);

      return { recentActivities };
    } catch (error) {
      console.error('Recent activity error:', error);
      return { recentActivities: [] };
    }
  }

  static async getQuickStats(facilityId: string) {
    try {
      const [
        pendingLabs,
        lowStockItems
      ] = await Promise.all([
        db.select({ count: sql<number>`COUNT(*)` }).from(labRequests).where(and(
          eq(labRequests.assignedLabId, facilityId),
          eq(labRequests.status, 'pending')
        )),
        db.select({ count: sql<number>`COUNT(*)` }).from(inventoryItems).where(and(
          eq(inventoryItems.facilityId, facilityId),
          sql`${inventoryItems.minStockLevel} > 0`
        ))
      ]);

      return {
        pendingLabs: pendingLabs[0]?.count || 0,
        lowStockItems: lowStockItems[0]?.count || 0
      };
    } catch (error) {
      console.error('Quick stats error:', error);
      return {
        pendingLabs: 0,
        lowStockItems: 0
      };
    }
  }

  static async getRevenueData(facilityId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    try {
      const revenueData = await db.select({
        month: sql<string>`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`,
        revenue: sql<number>`SUM(${payments.amount})`
      })
      .from(payments)
      .leftJoin(patients, eq(payments.patientId, patients.id))
      .where(and(
        eq(patients.facilityId, facilityId),
        gte(payments.createdAt, sixMonthsAgo),
        eq(payments.status, 'completed')
      ))
      .groupBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`);

      return revenueData;
    } catch (error) {
      console.error('Revenue data error:', error);
      return [];
    }
  }

  static async getAppointmentTrends(facilityId: string) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    try {
      const appointmentTrends = await db.select({
        date: appointments.appointmentDate,
        count: sql<number>`COUNT(*)`
      })
      .from(appointments)
      .where(and(
        eq(appointments.facilityId, facilityId),
        sql`${appointments.appointmentDate} >= ${weekAgoStr}`
      ))
      .groupBy(appointments.appointmentDate)
      .orderBy(appointments.appointmentDate);

      return appointmentTrends;
    } catch (error) {
      console.error('Appointment trends error:', error);
      return [];
    }
  }

  static async getInventoryStatus(facilityId: string) {
    try {
      const [
        inStock,
        lowStock,
        outOfStock
      ] = await Promise.all([
        db.select({ count: sql<number>`COUNT(*)` }).from(inventoryItems).where(
          eq(inventoryItems.facilityId, facilityId)
        ),
        db.select({ count: sql<number>`COUNT(*)` }).from(inventoryItems).where(
          eq(inventoryItems.facilityId, facilityId)
        ),
        db.select({ count: sql<number>`COUNT(*)` }).from(inventoryItems).where(
          eq(inventoryItems.facilityId, facilityId)
        )
      ]);

      return {
        inStock: inStock[0]?.count || 0,
        lowStock: lowStock[0]?.count || 0,
        outOfStock: outOfStock[0]?.count || 0
      };
    } catch (error) {
      console.error('Inventory status error:', error);
      return {
        inStock: 0,
        lowStock: 0,
        outOfStock: 0
      };
    }
  }
}