import { Router } from 'express';
import authRoutes from './auth.routes';
import { authLimiter, userRoleLimiter } from '../middleware/rate-limit.middleware';
import appointmentRoutes from './appointment.routes';
import patientRoutes from './patient.routes';
import doctorRoutes from './doctor.routes';
import adminRoutes from './admin.routes';
import inventoryRoutes from './inventory.routes';
import labRoutes from './lab.routes';
import pharmacyRoutes from './pharmacy.routes';
import paymentRoutes from './payment.routes';
import documentRoutes from './document.routes';
import moduleRoutes from './module.routes';
import workflowRoutes from './workflow.routes';
import reportRoutes from './report.routes';
import notificationRoutes from './notification.routes';
import monitoringRoutes from './monitoring.routes';
import backupRoutes from './backup.routes';
import settingsRoutes from './settings.routes';
import publicRoutes from './public.routes';
import dashboardRoutes from './dashboard.routes';
import onboardingRoutes from './onboarding.routes';
import scheduleRoutes from './schedule.routes';
import wardRoutes from './wards.routes';
import admissionRoutes from './admission.routes';
import nurseRoutes from './nurse.routes';
import patientFlowAnalyticsRoutes from './patient-flow-analytics.routes';
import nestedRoutes from './nested.routes';
import { hospitalContext, requireModule } from '../middleware/hospital.middleware';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Oluchukwu Specialist Hospital HMS API', version: '1.0.0' });
});

// Public routes — no auth needed
router.use('/auth',   authLimiter, authRoutes);
router.use('/public', publicRoutes);

// Protected routes — hospitalContext stamps facilityId, requireModule enforces access
router.use('/appointments', hospitalContext, userRoleLimiter, requireModule('appointments'), appointmentRoutes);
router.use('/patients',     hospitalContext, userRoleLimiter, requireModule('patients'),     patientRoutes);
router.use('/doctors',      hospitalContext, userRoleLimiter, requireModule('doctors'),      doctorRoutes);
router.use('/inventory',    hospitalContext, userRoleLimiter, requireModule('inventory'),    inventoryRoutes);
router.use('/lab',          hospitalContext, userRoleLimiter, requireModule('lab'),          labRoutes);
router.use('/pharmacy',     hospitalContext, userRoleLimiter, requireModule('pharmacy'),     pharmacyRoutes);
router.use('/payments',     hospitalContext, userRoleLimiter, requireModule('billing'),      paymentRoutes);
router.use('/documents',    hospitalContext, userRoleLimiter, requireModule('documents'),    documentRoutes);
router.use('/schedules',    hospitalContext, userRoleLimiter, scheduleRoutes);
router.use('/wards',        hospitalContext, userRoleLimiter, wardRoutes);
router.use('/admissions',   hospitalContext, userRoleLimiter, requireModule('admissions'),   admissionRoutes);
router.use('/nurse',        hospitalContext, userRoleLimiter, nurseRoutes);
router.use('/reports',      hospitalContext, userRoleLimiter, requireModule('reports'),      reportRoutes);

// Routes that don't map to a single toggleable module
router.use('/admin',        hospitalContext, userRoleLimiter, adminRoutes);
router.use('/dashboard',    hospitalContext, userRoleLimiter, dashboardRoutes);
router.use('/settings',     hospitalContext, userRoleLimiter, settingsRoutes);
router.use('/notifications',hospitalContext, userRoleLimiter, notificationRoutes);
router.use('/modules',                       userRoleLimiter, moduleRoutes);
router.use('/workflows',    hospitalContext, userRoleLimiter, workflowRoutes);
router.use('/monitoring',                    userRoleLimiter, monitoringRoutes);
router.use('/backup',                        userRoleLimiter, backupRoutes);
router.use('/onboarding',                    userRoleLimiter, onboardingRoutes);
router.use('/patient-flow', hospitalContext, userRoleLimiter, requireModule('admissions'),   patientFlowAnalyticsRoutes);
router.use('/nested',       hospitalContext, userRoleLimiter, nestedRoutes);

export default router;
