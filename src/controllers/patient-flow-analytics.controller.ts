import { Request, Response, NextFunction } from 'express';
import { PatientFlowAnalyticsService } from '../services/patient-flow-analytics.service';
import { successResponse } from '../utils/response.util';

export const getFlowStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const stats = await PatientFlowAnalyticsService.getBasicFlowStats(facilityId);
    successResponse(res, 'Patient flow statistics retrieved', stats);
  } catch (error) {
    next(error);
  }
};

export const getAdmissionTrend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { days = 7 } = req.query;
    const validDays = Math.min(Math.max(Number(days) || 7, 1), 30);
    
    const trend = await PatientFlowAnalyticsService.getDailyAdmissionTrend(facilityId, validDays);
    successResponse(res, 'Admission trend retrieved', { trend });
  } catch (error) {
    next(error);
  }
};

export const getWardOccupancy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const occupancy = await PatientFlowAnalyticsService.getWardOccupancy(facilityId);
    successResponse(res, 'Ward occupancy retrieved', { occupancy });
  } catch (error) {
    next(error);
  }
};