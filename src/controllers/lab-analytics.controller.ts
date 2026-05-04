import { Request, Response, NextFunction } from 'express';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { db } from '../config/db.config';
import { labAnalytics } from '../models/lab-analytics.model';
import { labRequests } from '../models/lab-requests.model';
import { labResults } from '../models/lab-results.model';
import { successResponse, errorResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';

export const generateDailyAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { date = new Date().toISOString().split('T')[0] } = req.body;

    const analytics = await db.select({
      totalTests: sql<number>`COUNT(*)`,
      completedTests: sql<number>`COUNT(CASE WHEN ${labRequests.status} = 'completed' THEN 1 END)`,
      avgTurnaroundTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${labResults.createdAt} - ${labRequests.createdAt})) / 3600)`,
      criticalResults: sql<number>`COUNT(CASE WHEN ${labResults.isCritical} = true THEN 1 END)`
    })
    .from(labRequests)
    .leftJoin(labResults, eq(labRequests.id, labResults.requestId))
    .where(and(
      eq(labRequests.assignedLabId, facilityId),
      sql`DATE(${labRequests.createdAt}) = ${date}`
    ));

    const [dailyStats] = analytics;
    
    await db.insert(labAnalytics).values({
      facilityId,
      date,
      totalTests: dailyStats.totalTests,
      completedTests: dailyStats.completedTests,
      avgTurnaroundTime: dailyStats.avgTurnaroundTime?.toString(),
      criticalResults: dailyStats.criticalResults
    });

    successResponse(res, 'Daily analytics generated', { analytics: dailyStats });
  } catch (error) {
    logger.error('Generate daily analytics error:', error);
    next(error);
  }
};

export const getPerformanceMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { startDate, endDate, period = '7' } = req.query;
    
    const start = startDate || new Date(Date.now() - parseInt(period as string) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const metrics = await db.select()
      .from(labAnalytics)
      .where(and(
        eq(labAnalytics.facilityId, facilityId),
        gte(labAnalytics.date, start as string),
        lte(labAnalytics.date, end as string)
      ))
      .orderBy(desc(labAnalytics.date));

    const summary = {
      totalTests: metrics.reduce((sum, m) => sum + (m.totalTests || 0), 0),
      avgCompletionRate: metrics.length ? 
        metrics.reduce((sum, m) => sum + ((m.completedTests || 0) / (m.totalTests || 1)), 0) / metrics.length * 100 : 0,
      avgTurnaroundTime: metrics.length ?
        metrics.reduce((sum, m) => sum + parseFloat(m.avgTurnaroundTime || '0'), 0) / metrics.length : 0,
      totalCriticalResults: metrics.reduce((sum, m) => sum + (m.criticalResults || 0), 0)
    };

    successResponse(res, 'Performance metrics retrieved', { metrics, summary });
  } catch (error) {
    logger.error('Get performance metrics error:', error);
    next(error);
  }
};

export const getTurnaroundAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    
    const analysis = await db.select({
      testName: labRequests.testName,
      avgTurnaroundHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${labResults.createdAt} - ${labRequests.createdAt})) / 3600)`,
      totalTests: sql<number>`COUNT(*)`,
      completedTests: sql<number>`COUNT(CASE WHEN ${labRequests.status} = 'completed' THEN 1 END)`
    })
    .from(labRequests)
    .leftJoin(labResults, eq(labRequests.id, labResults.requestId))
    .where(eq(labRequests.assignedLabId, facilityId))
    .groupBy(labRequests.testName)
    .orderBy(sql`AVG(EXTRACT(EPOCH FROM (${labResults.createdAt} - ${labRequests.createdAt})) / 3600) DESC`);

    successResponse(res, 'Turnaround analysis retrieved', { analysis });
  } catch (error) {
    logger.error('Get turnaround analysis error:', error);
    next(error);
  }
};