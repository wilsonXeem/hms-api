import { Request, Response, NextFunction } from 'express';
import { DashboardAnalyticsService } from '../services/dashboard-analytics.service';
import { successResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';

export const getKPIMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.params;
    const facilityId = req.facilityId!;
    
    const kpis = await DashboardAnalyticsService.calculateKPIs(role, facilityId);
    successResponse(res, 'KPI metrics retrieved successfully', kpis);
  } catch (error) {
    logger.error('KPI metrics error:', error);
    next(error);
  }
};

export const getTrendAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { metric } = req.params;
    const { period = '30d' } = req.query;
    const facilityId = req.facilityId!;
    
    const trends = await DashboardAnalyticsService.getTrendAnalysis(metric, facilityId, period as string);
    successResponse(res, 'Trend analysis retrieved successfully', trends);
  } catch (error) {
    logger.error('Trend analysis error:', error);
    next(error);
  }
};

export const getPerformanceMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.params.facilityId || req.facilityId!;
    
    const metrics = await DashboardAnalyticsService.getPerformanceMetrics(facilityId);
    successResponse(res, 'Performance metrics retrieved successfully', metrics);
  } catch (error) {
    logger.error('Performance metrics error:', error);
    next(error);
  }
};