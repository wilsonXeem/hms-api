import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

// Apply auth and admin role middleware to all routes
router.use(authMiddleware);
router.use(roleMiddleware(['admin']));

// User management
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deactivateUser);

// Facility settings
router.get('/facility', adminController.getFacilitySettings);
router.put('/facility', adminController.updateFacilitySettings);

// Activity logs
router.get('/logs', adminController.getActivityLogs);

// System stats
router.get('/stats', adminController.getSystemStats);
router.get('/operations', adminController.getOperationsSummary);

// Ward management
router.post('/wards', adminController.createWard);
router.put('/wards/:id', adminController.updateWard);
router.delete('/wards/:id', adminController.deleteWard);

// Doctor schedules
router.get('/schedules', adminController.getSchedules);
router.put('/schedules', adminController.saveSchedules);

// Module toggles
router.put('/modules/toggle', adminController.toggleModule);

// Notification settings
router.get('/notification-settings', adminController.getNotificationSettings);
router.put('/notification-settings', adminController.saveNotificationSettings);

// Role management
router.get('/roles', adminController.getRoles);
router.post('/roles', adminController.createRole);
router.put('/roles/:id', adminController.updateRole);
router.delete('/roles/:id', adminController.deleteRole);

// Facility management
router.get('/facilities', adminController.getFacilities);
router.post('/facilities', adminController.createFacility);
router.put('/facilities/:id', adminController.updateFacilityById);
router.delete('/facilities/:id', adminController.deleteFacility);

export default router;
