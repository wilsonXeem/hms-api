import { Request, Response, NextFunction } from 'express';
import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { db } from '../config/db.config';
import { patients } from '../models/patients.model';
import { consultations } from '../models/consultations.model';
import { dispensations } from '../models/dispensations.model';
import { labRequests } from '../models/lab-requests.model';
import { inventoryItems } from '../models/inventory-items.model';
import { inventoryBatches } from '../models/inventory-batches.model';
import { appointments } from '../models/appointments.model';
import { payments } from '../models/payments.model';
import { users } from '../models/users.model';
import { successResponse, errorResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';

export const getPatientReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const { startDate, endDate } = req.query;

    const patientStats = await db.select({
      totalPatients: sql<number>`COUNT(*)`,
      newPatients: sql<number>`COUNT(CASE WHEN ${patients.createdAt} >= ${startDate} AND ${patients.createdAt} <= ${endDate} THEN 1 END)`
    })
    .from(patients)
    .where(eq(patients.facilityId, facilityId));

    successResponse(res, 'Patient report generated', { stats: patientStats[0] });
  } catch (error) {
    logger.error('Get patient report error:', error);
    next(error);
  }
};

export const getConsultationReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    const consultationStats = await db.select({
      totalConsultations: sql<number>`COUNT(*)`,
      consultationsByDoctor: sql<number>`COUNT(DISTINCT ${consultations.doctorId})`
    })
    .from(consultations)
    .where(and(
      gte(consultations.createdAt, new Date(startDate as string)),
      lte(consultations.createdAt, new Date(endDate as string))
    ));

    successResponse(res, 'Consultation report generated', { stats: consultationStats[0] });
  } catch (error) {
    logger.error('Get consultation report error:', error);
    next(error);
  }
};

export const getInventoryReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;

    // Get item counts and total batches separately to avoid nested aggregates
    const [itemStats] = await db.select({
      totalItems: sql<number>`COUNT(DISTINCT ${inventoryItems.id})`,
      totalBatches: sql<number>`COUNT(${inventoryBatches.id})`,
      totalValue: sql<number>`COALESCE(SUM(CAST(${inventoryBatches.quantity} AS numeric) * CAST(${inventoryBatches.costPrice} AS numeric)), 0)`,
    })
    .from(inventoryItems)
    .leftJoin(inventoryBatches, eq(inventoryItems.id, inventoryBatches.itemId))
    .where(eq(inventoryItems.facilityId, facilityId));

    // Get low stock items in a separate query
    const lowStockRows = await db.select({
      id: inventoryItems.id,
      name: inventoryItems.name,
      minStockLevel: inventoryItems.minStockLevel,
      totalQty: sql<number>`COALESCE(SUM(CAST(${inventoryBatches.quantity} AS numeric)), 0)`
    })
    .from(inventoryItems)
    .leftJoin(inventoryBatches, eq(inventoryItems.id, inventoryBatches.itemId))
    .where(eq(inventoryItems.facilityId, facilityId))
    .groupBy(inventoryItems.id, inventoryItems.name, inventoryItems.minStockLevel);

    const lowStockItems = lowStockRows.filter(
      r => Number(r.totalQty) <= Number(r.minStockLevel)
    ).length;

    successResponse(res, 'Inventory report generated', {
      stats: { ...itemStats, lowStockItems }
    });
  } catch (error) {
    logger.error('Get inventory report error:', error);
    next(error);
  }
};

export const getLabReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const { startDate, endDate } = req.query;

    const labStats = await db.select({
      totalRequests: sql<number>`COUNT(*)`,
      completedRequests: sql<number>`COUNT(CASE WHEN ${labRequests.status} = 'completed' THEN 1 END)`,
      pendingRequests: sql<number>`COUNT(CASE WHEN ${labRequests.status} = 'pending' THEN 1 END)`
    })
    .from(labRequests)
    .where(and(
      eq(labRequests.assignedLabId, facilityId),
      gte(labRequests.createdAt, new Date(startDate as string)),
      lte(labRequests.createdAt, new Date(endDate as string))
    ));

    successResponse(res, 'Lab report generated', { stats: labStats[0] });
  } catch (error) {
    logger.error('Get lab report error:', error);
    next(error);
  }
};

export const getPharmacyReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    const pharmacyStats = await db.select({
      totalDispensations: sql<number>`COUNT(*)`,
      totalQuantityDispensed: sql<number>`SUM(${dispensations.quantityDispensed})`
    })
    .from(dispensations)
    .where(and(
      gte(dispensations.createdAt, new Date(startDate as string)),
      lte(dispensations.createdAt, new Date(endDate as string))
    ));

    successResponse(res, 'Pharmacy report generated', { stats: pharmacyStats[0] });
  } catch (error) {
    logger.error('Get pharmacy report error:', error);
    next(error);
  }
};

export const getRevenueReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const { startDate, endDate, department } = req.query;

    let whereConditions = [eq(patients.facilityId, facilityId)];
    
    if (startDate) {
      whereConditions.push(gte(payments.createdAt, new Date(startDate as string)));
    }
    if (endDate) {
      whereConditions.push(lte(payments.createdAt, new Date(endDate as string)));
    }
    if (department) {
      whereConditions.push(eq(payments.department, department as string));
    }

    const revenueStats = await db.select({
      totalRevenue: sql<number>`SUM(CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END)`,
      pendingRevenue: sql<number>`SUM(CASE WHEN ${payments.status} = 'pending' THEN ${payments.amount} ELSE 0 END)`,
      refundedAmount: sql<number>`SUM(CASE WHEN ${payments.status} = 'refunded' THEN ${payments.refundAmount} ELSE 0 END)`,
      totalTransactions: sql<number>`COUNT(*)`,
      completedTransactions: sql<number>`COUNT(CASE WHEN ${payments.status} = 'completed' THEN 1 END)`
    })
    .from(payments)
    .leftJoin(patients, eq(payments.patientId, patients.id))
    .where(and(...whereConditions));

    successResponse(res, 'Revenue report generated', { stats: revenueStats[0] });
  } catch (error) {
    logger.error('Get revenue report error:', error);
    next(error);
  }
};

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

    // Today's stats
    const todayStats = await db.select({
      todayPatients: sql<number>`COUNT(DISTINCT CASE WHEN ${patients.createdAt} >= ${startOfDay} THEN ${patients.id} END)`,
      todayConsultations: sql<number>`COUNT(DISTINCT CASE WHEN ${consultations.createdAt} >= ${startOfDay} THEN ${consultations.id} END)`,
      todayRevenue: sql<number>`SUM(CASE WHEN ${payments.createdAt} >= ${startOfDay} AND ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END)`,
      pendingLabTests: sql<number>`COUNT(CASE WHEN ${labRequests.status} = 'pending' THEN 1 END)`
    })
    .from(patients)
    .leftJoin(consultations, eq(patients.id, consultations.patientId))
    .leftJoin(payments, eq(patients.id, payments.patientId))
    .leftJoin(labRequests, eq(patients.id, labRequests.patientId))
    .where(eq(patients.facilityId, facilityId));

    // Overall stats
    const overallStats = await db.select({
      totalPatients: sql<number>`COUNT(DISTINCT ${patients.id})`,
      totalConsultations: sql<number>`COUNT(DISTINCT ${consultations.id})`,
      totalRevenue: sql<number>`SUM(CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END)`
    })
    .from(patients)
    .leftJoin(consultations, eq(patients.id, consultations.patientId))
    .leftJoin(payments, eq(patients.id, payments.patientId))
    .where(eq(patients.facilityId, facilityId));

    successResponse(res, 'Dashboard stats retrieved', {
      today: todayStats[0],
      overall: overallStats[0]
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    next(error);
  }
};

export const getDetailedReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const { reportType, startDate, endDate } = req.query;

    let reportData: any = {};

    switch (reportType) {
      case 'patient-demographics':
        reportData = await db.select({
          ageGroup: sql<string>`CASE 
            WHEN EXTRACT(YEAR FROM AGE(${patients.dob})) < 18 THEN 'Under 18'
            WHEN EXTRACT(YEAR FROM AGE(${patients.dob})) BETWEEN 18 AND 35 THEN '18-35'
            WHEN EXTRACT(YEAR FROM AGE(${patients.dob})) BETWEEN 36 AND 60 THEN '36-60'
            ELSE 'Over 60'
          END`,
          count: sql<number>`COUNT(*)`
        })
        .from(patients)
        .where(eq(patients.facilityId, facilityId))
        .groupBy(sql`CASE 
          WHEN EXTRACT(YEAR FROM AGE(${patients.dob})) < 18 THEN 'Under 18'
          WHEN EXTRACT(YEAR FROM AGE(${patients.dob})) BETWEEN 18 AND 35 THEN '18-35'
          WHEN EXTRACT(YEAR FROM AGE(${patients.dob})) BETWEEN 36 AND 60 THEN '36-60'
          ELSE 'Over 60'
        END`);
        break;

      case 'top-diagnoses':
        reportData = await db.select({
          diagnosis: consultations.diagnosis,
          count: sql<number>`COUNT(*)`
        })
        .from(consultations)
        .leftJoin(patients, eq(consultations.patientId, patients.id))
        .where(and(
          eq(patients.facilityId, facilityId),
          startDate ? gte(consultations.createdAt, new Date(startDate as string)) : sql`true`,
          endDate ? lte(consultations.createdAt, new Date(endDate as string)) : sql`true`
        ))
        .groupBy(consultations.diagnosis)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(10);
        break;

      default:
        return errorResponse(res, 'Invalid report type', undefined, 400);
    }

    successResponse(res, 'Detailed report generated', { reportData });
  } catch (error) {
    logger.error('Get detailed report error:', error);
    next(error);
  }
};

export const getFinancialReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const dateFormat = groupBy === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';

    const financialData = await db.select({
      period: sql<string>`TO_CHAR(DATE_TRUNC('${sql.raw(groupBy as string)}', ${payments.createdAt}), '${sql.raw(dateFormat)}')`,
      totalRevenue: sql<number>`SUM(CASE WHEN ${payments.status} = 'completed' THEN CAST(${payments.amount} AS numeric) ELSE 0 END)`,
      totalRefunds: sql<number>`SUM(CASE WHEN ${payments.status} = 'refunded' THEN CAST(${payments.refundAmount} AS numeric) ELSE 0 END)`,
      transactionCount: sql<number>`COUNT(*)`,
      avgTransactionValue: sql<number>`AVG(CASE WHEN ${payments.status} = 'completed' THEN CAST(${payments.amount} AS numeric) END)`
    })
    .from(payments)
    .leftJoin(patients, eq(payments.patientId, patients.id))
    .where(and(
      eq(patients.facilityId, facilityId),
      startDate ? gte(payments.createdAt, new Date(startDate as string)) : sql`true`,
      endDate ? lte(payments.createdAt, new Date(endDate as string)) : sql`true`
    ))
    .groupBy(sql`DATE_TRUNC('${sql.raw(groupBy as string)}', ${payments.createdAt})`)
    .orderBy(sql`DATE_TRUNC('${sql.raw(groupBy as string)}', ${payments.createdAt})`);

    const [summary] = await db.select({
      totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' THEN CAST(${payments.amount} AS numeric) ELSE 0 END), 0)`,
      totalRefunds: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'refunded' THEN CAST(${payments.refundAmount} AS numeric) ELSE 0 END), 0)`,
      netRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' THEN CAST(${payments.amount} AS numeric) ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN ${payments.status} = 'refunded' THEN CAST(${payments.refundAmount} AS numeric) ELSE 0 END), 0)`,
      totalTransactions: sql<number>`COUNT(*)`
    })
    .from(payments)
    .leftJoin(patients, eq(payments.patientId, patients.id))
    .where(and(
      eq(patients.facilityId, facilityId),
      startDate ? gte(payments.createdAt, new Date(startDate as string)) : sql`true`,
      endDate ? lte(payments.createdAt, new Date(endDate as string)) : sql`true`
    ));

    successResponse(res, 'Financial report generated', {
      data: financialData,
      summary
    });
  } catch (error) {
    logger.error('Get financial report error:', error);
    next(error);
  }
};

export const getOperationalReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const { startDate, endDate } = req.query;

    const operationalStats = await db.select({
      totalAppointments: sql<number>`COUNT(DISTINCT ${appointments.id})`,
      completedAppointments: sql<number>`COUNT(CASE WHEN ${appointments.status} = 'completed' THEN 1 END)`,
      cancelledAppointments: sql<number>`COUNT(CASE WHEN ${appointments.status} = 'cancelled' THEN 1 END)`,
      totalStaff: sql<number>`COUNT(DISTINCT ${users.id})`
    })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(users, eq(appointments.doctorId, users.id))
    .where(and(
      eq(patients.facilityId, facilityId),
      startDate ? gte(appointments.createdAt, new Date(startDate as string)) : sql`true`,
      endDate ? lte(appointments.createdAt, new Date(endDate as string)) : sql`true`
    ));

    successResponse(res, 'Operational report generated', { stats: operationalStats[0] });
  } catch (error) {
    logger.error('Get operational report error:', error);
    next(error);
  }
};

export const getAnalyticsReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = (req as any).facilityId!;
    const { startDate, endDate } = req.query;

    const analyticsData = await db.select({
      patientGrowth: sql<number>`COUNT(DISTINCT ${patients.id})`,
      revenueGrowth: sql<number>`SUM(CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END)`,
      appointmentTrends: sql<number>`COUNT(DISTINCT ${appointments.id})`,
      departmentPerformance: sql<number>`COUNT(DISTINCT ${consultations.id})`
    })
    .from(patients)
    .leftJoin(payments, eq(patients.id, payments.patientId))
    .leftJoin(appointments, eq(patients.id, appointments.patientId))
    .leftJoin(consultations, eq(patients.id, consultations.patientId))
    .where(and(
      eq(patients.facilityId, facilityId),
      startDate ? gte(patients.createdAt, new Date(startDate as string)) : sql`true`,
      endDate ? lte(patients.createdAt, new Date(endDate as string)) : sql`true`
    ));

    successResponse(res, 'Analytics report generated', { data: analyticsData[0] });
  } catch (error) {
    logger.error('Get analytics report error:', error);
    next(error);
  }
};

export const getReportSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schedules = [
      { id: 1, name: 'Daily Revenue Report', frequency: 'daily', nextRun: new Date() },
      { id: 2, name: 'Weekly Patient Summary', frequency: 'weekly', nextRun: new Date() },
      { id: 3, name: 'Monthly Analytics', frequency: 'monthly', nextRun: new Date() }
    ];

    successResponse(res, 'Report schedules retrieved', { schedules });
  } catch (error) {
    logger.error('Get report schedule error:', error);
    next(error);
  }
};

export const exportReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportType, format = 'json' } = req.query;
    
    switch (reportType) {
      case 'financial':
      case 'operational':
      case 'analytics':
        break;
      default:
        return errorResponse(res, 'Invalid report type', undefined, 400);
    }

    const reportData = { message: 'Report export functionality not implemented' };

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report.csv`);
      const csvData = JSON.stringify(reportData).replace(/[{}\\[\\]"]/g, '').replace(/,/g, '\\n');
      res.send(csvData);
    } else {
      successResponse(res, 'Report exported', reportData);
    }
  } catch (error) {
    logger.error('Export report error:', error);
    next(error);
  }
};