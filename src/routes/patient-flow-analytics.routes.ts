import { Router } from 'express';
import {
  getFlowStats,
  getAdmissionTrend,
  getWardOccupancy
} from '../controllers/patient-flow-analytics.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { addFacilityContext } from '../middleware/facility.middleware';

const router = Router();

// Apply authentication and facility validation to all routes
router.use(authenticateToken);
router.use(addFacilityContext);

// Patient flow analytics routes
router.get('/stats', getFlowStats);
router.get('/admission-trend', getAdmissionTrend);
router.get('/ward-occupancy', getWardOccupancy);

export default router;