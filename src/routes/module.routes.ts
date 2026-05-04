import { Router } from 'express';
import { ModuleController } from '../controllers/module.controller';
import { addTenantContext } from '../middleware/tenant.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Modules
 *   description: Module management and configuration
 */

// Apply auth and tenant middleware
router.use(authMiddleware);
router.use(addTenantContext);

/**
 * @swagger
 * /api/modules/facility/{facilityId}:
 *   get:
 *     summary: Get enabled modules for facility
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 */
router.get('/facility/:facilityId', ModuleController.getEnabledModules);

/**
 * @swagger
 * /api/modules/facility/{facilityId}/{moduleName}/enable:
 *   post:
 *     summary: Enable module for facility (admin only)
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 */
router.post('/facility/:facilityId/:moduleName/enable', roleMiddleware(['admin']), ModuleController.enableModule);

/**
 * @swagger
 * /api/modules/facility/{facilityId}/{moduleName}/disable:
 *   post:
 *     summary: Disable module for facility (admin only)
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 */
router.post('/facility/:facilityId/:moduleName/disable', roleMiddleware(['admin']), ModuleController.disableModule);

export default router;