import { Router } from 'express';
import { getDashboardData, getGeneralStats } from '../controllers/dashboard.controller';
import { getKPIMetrics, getTrendAnalysis, getPerformanceMetrics } from '../controllers/dashboard-analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { cache } from '../middleware/cache.middleware';

const router = Router();

router.use(authMiddleware);

// Cache dashboard data
router.get('/stats', cache({ ttl: 120, keyPrefix: 'dashboard' }), getGeneralStats);
router.get('/kpi/:role', cache({ ttl: 300, keyPrefix: 'dashboard' }), getKPIMetrics);
router.get('/trends/:metric', cache({ ttl: 600, keyPrefix: 'dashboard' }), getTrendAnalysis);
router.get('/performance/:facilityId', cache({ ttl: 300, keyPrefix: 'dashboard' }), getPerformanceMetrics);
router.get('/performance', cache({ ttl: 300, keyPrefix: 'dashboard' }), getPerformanceMetrics);
router.get('/:role', cache({ ttl: 120, keyPrefix: 'dashboard' }), getDashboardData);

export default router;