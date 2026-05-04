import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { cache } from '../middleware/cache.middleware';
import {
  getPatientReport,
  getConsultationReport,
  getInventoryReport,
  getLabReport,
  getPharmacyReport,
  getRevenueReport,
  getDashboardStats,
  getDetailedReport,
  getFinancialReport,
  getOperationalReport,
  getAnalyticsReport,
  exportReport,
  getReportSchedule
} from '../controllers/report.controller';

const router = Router();

// All report routes require authentication
router.use(authMiddleware);

// Dashboard statistics
router.get('/dashboard', cache({ ttl: 300, keyPrefix: 'dashboard' }), getDashboardStats);

// Basic reports
router.get('/patients', roleMiddleware(['admin', 'doctor', 'receptionist']), cache({ ttl: 600, keyPrefix: 'reports' }), getPatientReport);
router.get('/consultations', roleMiddleware(['admin', 'doctor']), cache({ ttl: 600, keyPrefix: 'reports' }), getConsultationReport);
router.get('/inventory', roleMiddleware(['admin', 'pharmacist']), cache({ ttl: 600, keyPrefix: 'reports' }), getInventoryReport);
router.get('/lab', roleMiddleware(['admin', 'lab_tech', 'doctor']), cache({ ttl: 600, keyPrefix: 'reports' }), getLabReport);
router.get('/pharmacy', roleMiddleware(['admin', 'pharmacist']), cache({ ttl: 600, keyPrefix: 'reports' }), getPharmacyReport);

// Financial reports
router.get('/revenue', roleMiddleware(['admin', 'receptionist']), cache({ ttl: 600, keyPrefix: 'reports' }), getRevenueReport);

// Detailed reports
router.get('/detailed', roleMiddleware(['admin']), cache({ ttl: 600, keyPrefix: 'reports' }), getDetailedReport);

// Comprehensive reporting
router.get('/financial', roleMiddleware(['admin', 'receptionist']), cache({ ttl: 600, keyPrefix: 'reports' }), getFinancialReport);
router.get('/operational', roleMiddleware(['admin']), cache({ ttl: 600, keyPrefix: 'reports' }), getOperationalReport);
router.get('/analytics', roleMiddleware(['admin']), cache({ ttl: 600, keyPrefix: 'reports' }), getAnalyticsReport);
router.get('/export', roleMiddleware(['admin']), exportReport);
router.get('/schedules', roleMiddleware(['admin']), getReportSchedule);

export default router;