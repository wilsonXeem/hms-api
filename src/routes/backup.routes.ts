import { Router } from 'express';
import * as backupController from '../controllers/backup.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

// Apply auth middleware - only admins can manage backups
router.use(authMiddleware);
router.use(roleMiddleware(['admin']));

/**
 * @swagger
 * /api/backup:
 *   post:
 *     summary: Create database backup
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Backup created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/', backupController.createBackup);

/**
 * @swagger
 * /api/backup:
 *   get:
 *     summary: List available backups
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backups listed successfully
 */
router.get('/', backupController.listBackups);

/**
 * @swagger
 * /api/backup/restore/{backupFile}:
 *   post:
 *     summary: Restore database from backup
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: backupFile
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Database restored successfully
 */
router.post('/restore/:backupFile', backupController.restoreBackup);

export default router;