import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { successResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';

export const getDashboardData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.params;
    const facilityId = req.facilityId!;
    const userId = req.user?.id!;

    const dashboardData = await DashboardService.getDashboardByRole(role, facilityId, userId);
    
    successResponse(res, 'Dashboard data retrieved successfully', dashboardData);
  } catch (error) {
    logger.error('Dashboard data error:', error);
    next(error);
  }
};

export const getGeneralStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    
    const stats = await DashboardService.getGeneralStats(facilityId);
    
    successResponse(res, 'General stats retrieved successfully', stats);
  } catch (error) {
    logger.error('General stats error:', error);
    next(error);
  }
};