import { Router } from 'express';
import { TenantSetupController } from '../controllers/tenant-setup.controller';
import { authLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// Apply rate limiting to public routes
router.use(authLimiter);

// Public routes for tenant setup
router.get('/organization-types', TenantSetupController.getOrganizationTypes);
router.get('/modules', TenantSetupController.getAvailableModules);
router.get('/subdomain/:subdomain/availability', TenantSetupController.checkSubdomainAvailability);
router.get('/packages/:orgType', TenantSetupController.getPackagesByOrgType);
router.post('/setup', TenantSetupController.setupTenant);

export default router;