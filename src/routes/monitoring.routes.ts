import { Router } from 'express';
import { monitoringService } from '../services/monitoring.service';
import { responseUtil } from '../utils/response.util';

const router = Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const health = await monitoringService.getHealthStatus();
    if (health.status === 'healthy') {
      responseUtil.sendSuccess(res, 'System is healthy', health);
    } else {
      responseUtil.sendError(res, 'System is unhealthy', undefined, 503);
    }
  } catch (error) {
    responseUtil.sendError(res, 'Health check failed', undefined, 503);
  }
});

// Readiness check
router.get('/ready', async (req, res) => {
  try {
    const ready = await monitoringService.getReadinessStatus();
    if (ready.ready) {
      responseUtil.sendSuccess(res, 'System is ready', ready);
    } else {
      responseUtil.sendError(res, 'System is not ready', undefined, 503);
    }
  } catch (error) {
    responseUtil.sendError(res, 'Readiness check failed', undefined, 503);
  }
});

// Liveness check
router.get('/live', (req, res) => {
  responseUtil.sendSuccess(res, 'System is alive', { status: 'alive', timestamp: new Date() });
});

// Metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await monitoringService.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    responseUtil.sendError(res, 'Failed to get metrics');
  }
});

export default router;