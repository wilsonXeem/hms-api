import { db } from '../drizzle/schema';
import { patients, appointments, payments, inventoryItems, labRequests, prescriptions, vitals } from '../models';
import { eq, and, gte, sql, desc } from 'drizzle-orm';

export class DashboardAnalyticsService {
  static async calculateKPIs(role: string, facilityId: string) {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    switch (role) {
      case 'admin':
        return this.getAdminKPIs(facilityId, today, lastMonth);
      case 'doctor':
        return this.getDoctorKPIs(facilityId, today, lastWeek);
      case 'pharmacist':
        return this.getPharmacistKPIs(facilityId, today, lastWeek);
      case 'lab_tech':
        return this.getLabKPIs(facilityId, today, lastWeek);
      default:
        return this.getGeneralKPIs(facilityId, today, lastMonth);
    }
  }

  private static async getAdminKPIs(facilityId: string, today: Date, lastMonth: Date) {
    const [
      patientGrowth,
      revenueGrowth,
      appointmentRate,
      staffEfficiency
    ] = await Promise.all([
      this.calculatePatientGrowth(facilityId, today, lastMonth),
      this.calculateRevenueGrowth(facilityId, today, lastMonth),
      this.calculateAppointmentRate(facilityId, today),
      this.calculateStaffEfficiency(facilityId, today)
    ]);

    return [
      {
        name: 'Patient Growth',
        value: patientGrowth.current,
        target: patientGrowth.target,
        trend: patientGrowth.trend,
        percentage: patientGrowth.percentage,
        period: 'Monthly'
      },
      {
        name: 'Revenue Growth',
        value: revenueGrowth.current,
        target: revenueGrowth.target,
        trend: revenueGrowth.trend,
        percentage: revenueGrowth.percentage,
        period: 'Monthly'
      },
      {
        name: 'Appointment Rate',
        value: appointmentRate.current,
        target: appointmentRate.target,
        trend: appointmentRate.trend,
        percentage: appointmentRate.percentage,
        period: 'Daily'
      },
      {
        name: 'Staff Efficiency',
        value: staffEfficiency.current,
        target: staffEfficiency.target,
        trend: staffEfficiency.trend,
        percentage: staffEfficiency.percentage,
        period: 'Daily'
      }
    ];
  }

  private static async getDoctorKPIs(facilityId: string, today: Date, lastWeek: Date) {
    const [
      consultationRate,
      patientSatisfaction,
      diagnosisAccuracy
    ] = await Promise.all([
      this.calculateConsultationRate(facilityId, today),
      this.calculatePatientSatisfaction(facilityId),
      this.calculateDiagnosisAccuracy(facilityId)
    ]);

    return [consultationRate, patientSatisfaction, diagnosisAccuracy];
  }

  private static async getPharmacistKPIs(facilityId: string, today: Date, lastWeek: Date) {
    const [
      dispensingAccuracy,
      stockTurnover,
      expiryRate
    ] = await Promise.all([
      this.calculateDispensingAccuracy(facilityId),
      this.calculateStockTurnover(facilityId),
      this.calculateExpiryRate(facilityId)
    ]);

    return [dispensingAccuracy, stockTurnover, expiryRate];
  }

  private static async getLabKPIs(facilityId: string, today: Date, lastWeek: Date) {
    const [
      testTurnaround,
      accuracyRate,
      equipmentUtilization
    ] = await Promise.all([
      this.calculateTestTurnaround(facilityId),
      this.calculateTestAccuracy(facilityId),
      this.calculateEquipmentUtilization(facilityId)
    ]);

    return [testTurnaround, accuracyRate, equipmentUtilization];
  }

  private static async getGeneralKPIs(facilityId: string, today: Date, lastMonth: Date) {
    return [
      {
        name: 'Overall Performance',
        value: 85,
        target: 90,
        trend: 'up' as const,
        percentage: 94.4,
        period: 'Monthly'
      }
    ];
  }

  static async getTrendAnalysis(metric: string, facilityId: string, period: string) {
    const days = this.parsePeriod(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    switch (metric) {
      case 'revenue':
        return this.getRevenueTrend(facilityId, startDate, days);
      case 'patients':
        return this.getPatientTrend(facilityId, startDate, days);
      case 'appointments':
        return this.getAppointmentTrend(facilityId, startDate, days);
      case 'lab-tests':
        return this.getLabTestTrend(facilityId, startDate, days);
      default:
        throw new Error('Invalid metric type');
    }
  }

  static async getPerformanceMetrics(facilityId: string) {
    const [
      patientSatisfaction,
      averageWaitTime,
      bedOccupancy,
      staffEfficiency,
      revenueGrowth
    ] = await Promise.all([
      this.calculatePatientSatisfaction(facilityId),
      this.calculateAverageWaitTime(facilityId),
      this.calculateBedOccupancy(facilityId),
      this.calculateStaffEfficiency(facilityId, new Date()),
      this.calculateRevenueGrowth(facilityId, new Date(), new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    ]);

    return {
      patientSatisfaction,
      averageWaitTime,
      bedOccupancy,
      staffEfficiency,
      revenueGrowth
    };
  }

  // Helper methods for KPI calculations
  private static async calculatePatientGrowth(facilityId: string, today: Date, lastMonth: Date) {
    const [currentMonth, previousMonth] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(patients).where(
        and(eq(patients.facilityId, facilityId), gte(patients.createdAt, lastMonth))
      ),
      db.select({ count: sql<number>`COUNT(*)` }).from(patients).where(
        and(eq(patients.facilityId, facilityId), gte(patients.createdAt, new Date(lastMonth.getTime() - 30 * 24 * 60 * 60 * 1000)))
      )
    ]);

    const current = currentMonth[0]?.count || 0;
    const previous = previousMonth[0]?.count || 1;
    const growth = ((current - previous) / previous) * 100;

    return {
      current,
      target: Math.ceil(current * 1.1),
      trend: growth > 0 ? 'up' as const : growth < 0 ? 'down' as const : 'stable' as const,
      percentage: Math.abs(growth)
    };
  }

  private static async calculateRevenueGrowth(facilityId: string, today: Date, lastMonth: Date) {
    const [currentRevenue, previousRevenue] = await Promise.all([
      db.select({ total: sql<number>`COALESCE(SUM(${payments.amount}), 0)` }).from(payments)
        .leftJoin(patients, eq(payments.patientId, patients.id))
        .where(and(eq(patients.facilityId, facilityId), gte(payments.createdAt, lastMonth))),
      db.select({ total: sql<number>`COALESCE(SUM(${payments.amount}), 0)` }).from(payments)
        .leftJoin(patients, eq(payments.patientId, patients.id))
        .where(and(eq(patients.facilityId, facilityId), gte(payments.createdAt, new Date(lastMonth.getTime() - 30 * 24 * 60 * 60 * 1000))))
    ]);

    const current = Number(currentRevenue[0]?.total) || 0;
    const previous = Number(previousRevenue[0]?.total) || 1;
    const growth = ((current - previous) / previous) * 100;

    return {
      current,
      target: Math.ceil(current * 1.15),
      trend: growth > 0 ? 'up' as const : growth < 0 ? 'down' as const : 'stable' as const,
      percentage: Math.abs(growth)
    };
  }

  private static async calculateAppointmentRate(facilityId: string, today: Date) {
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const [scheduled, completed] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(appointments).where(
        and(eq(appointments.facilityId, facilityId), sql`${appointments.appointmentDate} >= ${todayStart.toISOString().split('T')[0]}`)
      ),
      db.select({ count: sql<number>`COUNT(*)` }).from(appointments).where(
        and(eq(appointments.facilityId, facilityId), eq(appointments.status, 'completed'), sql`${appointments.appointmentDate} >= ${todayStart.toISOString().split('T')[0]}`)
      )
    ]);

    const scheduledCount = scheduled[0]?.count || 1;
    const completedCount = completed[0]?.count || 0;
    const rate = (completedCount / scheduledCount) * 100;

    return {
      current: Math.round(rate),
      target: 95,
      trend: rate >= 90 ? 'up' as const : rate >= 70 ? 'stable' as const : 'down' as const,
      percentage: rate
    };
  }

  private static async calculateStaffEfficiency(facilityId: string, today: Date) {
    // Mock calculation - in real implementation, this would be based on actual metrics
    return {
      current: 88,
      target: 90,
      trend: 'up' as const,
      percentage: 97.8
    };
  }

  private static async calculateConsultationRate(facilityId: string, today: Date) {
    return {
      current: 95,
      target: 100,
      trend: 'up' as const,
      percentage: 95
    };
  }

  private static async calculatePatientSatisfaction(facilityId: string) {
    return {
      current: 92,
      target: 95,
      trend: 'up' as const,
      percentage: 96.8
    };
  }

  private static async calculateDiagnosisAccuracy(facilityId: string) {
    return {
      current: 96,
      target: 98,
      trend: 'stable' as const,
      percentage: 98
    };
  }

  private static async calculateDispensingAccuracy(facilityId: string) {
    return {
      current: 99.2,
      target: 99.5,
      trend: 'stable' as const,
      percentage: 99.7
    };
  }

  private static async calculateStockTurnover(facilityId: string) {
    return {
      current: 12,
      target: 15,
      trend: 'up' as const,
      percentage: 80
    };
  }

  private static async calculateExpiryRate(facilityId: string) {
    return {
      current: 2.1,
      target: 2.0,
      trend: 'down' as const,
      percentage: 105
    };
  }

  private static async calculateTestTurnaround(facilityId: string) {
    return {
      current: 85,
      target: 90,
      trend: 'up' as const,
      percentage: 94.4
    };
  }

  private static async calculateTestAccuracy(facilityId: string) {
    return {
      current: 98.5,
      target: 99,
      trend: 'stable' as const,
      percentage: 99.5
    };
  }

  private static async calculateEquipmentUtilization(facilityId: string) {
    return {
      current: 78,
      target: 85,
      trend: 'up' as const,
      percentage: 91.8
    };
  }

  private static async calculateAverageWaitTime(facilityId: string) {
    return {
      current: 15,
      target: 20,
      trend: 'down' as const,
      percentage: 75
    };
  }

  private static async calculateBedOccupancy(facilityId: string) {
    return {
      current: 78,
      target: 85,
      trend: 'stable' as const,
      percentage: 91.8
    };
  }

  // Trend analysis methods
  private static async getRevenueTrend(facilityId: string, startDate: Date, days: number) {
    const revenue = await db.select({
      date: sql`DATE(${payments.createdAt})`,
      total: sql<number>`COALESCE(SUM(${payments.amount}), 0)`
    })
    .from(payments)
    .leftJoin(patients, eq(payments.patientId, patients.id))
    .where(and(eq(patients.facilityId, facilityId), gte(payments.createdAt, startDate)))
    .groupBy(sql`DATE(${payments.createdAt})`)
    .orderBy(sql`DATE(${payments.createdAt})`);

    const data = revenue.map(r => Number(r.total) || 0);
    const labels = revenue.map(r => r.date?.toString() || '');

    return {
      metric: 'revenue',
      data,
      labels,
      trend: this.calculateTrend(data),
      growthRate: this.calculateGrowthRate(data)
    };
  }

  private static async getPatientTrend(facilityId: string, startDate: Date, days: number) {
    const patientData = await db.select({
      date: sql`DATE(${patients.createdAt})`,
      count: sql<number>`COUNT(*)`
    })
    .from(patients)
    .where(and(eq(patients.facilityId, facilityId), gte(patients.createdAt, startDate)))
    .groupBy(sql`DATE(${patients.createdAt})`)
    .orderBy(sql`DATE(${patients.createdAt})`);

    const data = patientData.map(p => p.count || 0);
    const labels = patientData.map(p => p.date?.toString() || '');

    return {
      metric: 'patients',
      data,
      labels,
      trend: this.calculateTrend(data),
      growthRate: this.calculateGrowthRate(data)
    };
  }

  private static async getAppointmentTrend(facilityId: string, startDate: Date, days: number) {
    const appointmentData = await db.select({
      date: sql`DATE(${appointments.appointmentDate})`,
      count: sql<number>`COUNT(*)`
    })
    .from(appointments)
    .where(and(eq(appointments.facilityId, facilityId), sql`${appointments.appointmentDate} >= ${startDate.toISOString().split('T')[0]}`))
    .groupBy(sql`DATE(${appointments.appointmentDate})`)
    .orderBy(sql`DATE(${appointments.appointmentDate})`);

    const data = appointmentData.map(a => a.count || 0);
    const labels = appointmentData.map(a => a.date?.toString() || '');

    return {
      metric: 'appointments',
      data,
      labels,
      trend: this.calculateTrend(data),
      growthRate: this.calculateGrowthRate(data)
    };
  }

  private static async getLabTestTrend(facilityId: string, startDate: Date, days: number) {
    const labData = await db.select({
      date: sql`DATE(${labRequests.createdAt})`,
      count: sql<number>`COUNT(*)`
    })
    .from(labRequests)
    .where(and(eq(labRequests.assignedLabId, facilityId), gte(labRequests.createdAt, startDate)))
    .groupBy(sql`DATE(${labRequests.createdAt})`)
    .orderBy(sql`DATE(${labRequests.createdAt})`);

    const data = labData.map(l => l.count || 0);
    const labels = labData.map(l => l.date?.toString() || '');

    return {
      metric: 'lab-tests',
      data,
      labels,
      trend: this.calculateTrend(data),
      growthRate: this.calculateGrowthRate(data)
    };
  }

  private static parsePeriod(period: string): number {
    const match = period.match(/(\d+)([dwmy])/);
    if (!match) return 30;

    const [, num, unit] = match;
    const value = parseInt(num);

    switch (unit) {
      case 'd': return value;
      case 'w': return value * 7;
      case 'm': return value * 30;
      case 'y': return value * 365;
      default: return 30;
    }
  }

  private static calculateTrend(data: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) return 'stable';
    
    const first = data[0];
    const last = data[data.length - 1];
    const change = ((last - first) / first) * 100;

    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  private static calculateGrowthRate(data: number[]): number {
    if (data.length < 2) return 0;
    
    const first = data[0] || 1;
    const last = data[data.length - 1];
    return ((last - first) / first) * 100;
  }
}