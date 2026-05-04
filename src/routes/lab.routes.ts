import { Router } from 'express';
import * as labController from '../controllers/lab.controller';
import * as labAnalyticsController from '../controllers/lab-analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { addFacilityContext } from '../middleware/facility.middleware';
import { cache, labResultsCache } from '../middleware/cache.middleware';
import { CacheInvalidator } from '../utils/cache-invalidation.util';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Laboratory
 *   description: Laboratory test requests and results management
 */

// Apply auth and facility middleware
router.use(authMiddleware);
router.use(addFacilityContext);

// Lab request management
/**
 * @swagger
 * /api/lab/requests:
 *   post:
 *     summary: Create a new lab test request
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - testType
 *               - priority
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               testType:
 *                 type: string
 *                 example: Blood Test
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *                 example: normal
 *               notes:
 *                 type: string
 *                 example: Routine checkup
 *     responses:
 *       201:
 *         description: Lab request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         request:
 *                           $ref: '#/components/schemas/LabRequest'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions (Doctor role required)
 */
router.post('/requests', roleMiddleware(['doctor']), async (req, res, next) => {
  await labController.createLabRequest(req, res, next);
  if (res.statusCode < 400) await CacheInvalidator.invalidateLab();
});

/**
 * @swagger
 * /api/lab/requests/bulk:
 *   post:
 *     summary: Create multiple lab test requests
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requests
 *             properties:
 *               requests:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     patientId:
 *                       type: string
 *                       format: uuid
 *                     testType:
 *                       type: string
 *                     priority:
 *                       type: string
 *                       enum: [low, normal, high, urgent]
 *     responses:
 *       201:
 *         description: Bulk lab requests created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/requests/bulk', roleMiddleware(['doctor']), labController.createBulkLabRequests);

/**
 * @swagger
 * /api/lab/requests:
 *   get:
 *     summary: Get all lab requests
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed, cancelled]
 *         description: Filter by request status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *         description: Filter by priority
 *     responses:
 *       200:
 *         description: Lab requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         requests:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/LabRequest'
 */
router.get('/requests', labResultsCache, labController.getLabRequests);

router.get('/results/all', roleMiddleware(['lab_tech', 'admin', 'doctor']), labResultsCache, labController.getAllLabResults);

// Worklist — grouped by category with TAT
router.get('/worklist', roleMiddleware(['lab_tech', 'admin']), labController.getWorklist);

// Sample collection
router.post('/requests/:id/collect', roleMiddleware(['lab_tech', 'admin']), async (req, res, next) => {
  await labController.collectSample(req, res, next);
  if (res.statusCode < 400) await CacheInvalidator.invalidateLab();
});

// Patient result history
router.get('/patient/:patientId/history', roleMiddleware(['lab_tech', 'admin', 'doctor', 'nurse']), labController.getPatientLabHistory);

// Daily workload stats
router.get('/stats/daily', roleMiddleware(['lab_tech', 'admin']), labController.getDailyStats);

/**
 * @swagger
 * /api/lab/requests/{id}:
 *   get:
 *     summary: Get lab request details
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lab request details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         request:
 *                           $ref: '#/components/schemas/LabRequest'
 *       404:
 *         description: Lab request not found
 */
router.get('/requests/:id', labResultsCache, labController.getLabRequestDetails);

/**
 * @swagger
 * /api/lab/requests/{id}/status:
 *   put:
 *     summary: Update lab request status
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed, cancelled]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions (Lab tech or admin required)
 *       404:
 *         description: Lab request not found
 */
router.put('/requests/:id/status', roleMiddleware(['lab_tech', 'admin']), async (req, res, next) => {
  await labController.updateRequestStatus(req, res, next);
  if (res.statusCode < 400) await CacheInvalidator.invalidateLab();
});

// Lab results management
/**
 * @swagger
 * /api/lab/results:
 *   post:
 *     summary: Upload lab test results
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestId
 *               - results
 *             properties:
 *               requestId:
 *                 type: string
 *                 format: uuid
 *               results:
 *                 type: object
 *                 description: Test results data
 *               notes:
 *                 type: string
 *               isCritical:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Lab results uploaded successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions (Lab tech or admin required)
 */
router.post('/results', roleMiddleware(['lab_tech', 'admin']), async (req, res, next) => {
  await labController.uploadLabResult(req, res, next);
  if (res.statusCode < 400) {
    await CacheInvalidator.invalidateLab();
    await CacheInvalidator.invalidateReports();
  }
});

/**
 * @swagger
 * /api/lab/results/{patientId}:
 *   get:
 *     summary: Get lab results for a patient
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter results from this date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter results to this date
 *     responses:
 *       200:
 *         description: Lab results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/results/:patientId', labResultsCache, labController.getLabResults);

/**
 * @swagger
 * /api/lab/results/critical:
 *   get:
 *     summary: Get critical lab results requiring attention
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Critical results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/results/critical', roleMiddleware(['lab_tech', 'doctor', 'admin']), labResultsCache, labController.getCriticalResults);

// Test catalog
/**
 * @swagger
 * /api/lab/catalog:
 *   get:
 *     summary: Get available lab tests catalog
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test catalog retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         tests:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               name:
 *                                 type: string
 *                               category:
 *                                 type: string
 *                               price:
 *                                 type: number
 *                               normalRange:
 *                                 type: string
 */
router.get('/catalog', cache({ ttl: 1800, keyPrefix: 'catalog' }), labController.getTestCatalog);

/**
 * @swagger
 * /api/lab/catalog:
 *   post:
 *     summary: Add new test to catalog
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 example: Complete Blood Count
 *               category:
 *                 type: string
 *                 example: Hematology
 *               price:
 *                 type: number
 *                 example: 25.00
 *               normalRange:
 *                 type: string
 *                 example: 4.5-11.0 x10^9/L
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Test added to catalog successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions (Admin required)
 */
router.post('/catalog', roleMiddleware(['admin']), labController.addTestToCatalog);

// Analytics routes
/**
 * @swagger
 * /api/lab/analytics/performance:
 *   get:
 *     summary: Get lab performance metrics
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           default: "7"
 *         description: Number of days to analyze
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 */
router.get('/analytics/performance', roleMiddleware(['lab_tech', 'admin', 'doctor']), cache({ ttl: 600, keyPrefix: 'analytics' }), labAnalyticsController.getPerformanceMetrics);

/**
 * @swagger
 * /api/lab/analytics/turnaround:
 *   get:
 *     summary: Get turnaround time analysis
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Turnaround analysis retrieved successfully
 */
router.get('/analytics/turnaround', roleMiddleware(['lab_tech', 'admin', 'doctor']), cache({ ttl: 600, keyPrefix: 'analytics' }), labAnalyticsController.getTurnaroundAnalysis);

/**
 * @swagger
 * /api/lab/analytics/daily:
 *   post:
 *     summary: Generate daily analytics
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Daily analytics generated successfully
 */
router.post('/analytics/daily', roleMiddleware(['admin']), labAnalyticsController.generateDailyAnalytics);

// Quality Control routes
/**
 * @swagger
 * /api/lab/quality-control/samples:
 *   get:
 *     summary: Get sample tracking information
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sample tracking data retrieved successfully
 */
router.get('/quality-control/samples', roleMiddleware(['lab_tech', 'admin']), labController.getSampleTracking);

/**
 * @swagger
 * /api/lab/quality-control/samples/{barcode}:
 *   get:
 *     summary: Track specific sample by barcode
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sample details retrieved successfully
 */
router.get('/quality-control/samples/:barcode', roleMiddleware(['lab_tech', 'admin']), labController.getSampleByBarcode);

/**
 * @swagger
 * /api/lab/quality-control/equipment:
 *   get:
 *     summary: Get equipment calibration status
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Equipment calibration data retrieved successfully
 */
router.get('/quality-control/equipment', roleMiddleware(['lab_tech', 'admin']), labController.getEquipmentCalibration);

/**
 * @swagger
 * /api/lab/quality-control/calibration:
 *   post:
 *     summary: Record equipment calibration
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - equipmentId
 *               - calibrationDate
 *               - nextDueDate
 *             properties:
 *               equipmentId:
 *                 type: string
 *               calibrationDate:
 *                 type: string
 *                 format: date
 *               nextDueDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Calibration recorded successfully
 */
router.post('/quality-control/calibration', roleMiddleware(['lab_tech', 'admin']), labController.recordCalibration);

/**
 * @swagger
 * /api/lab/quality-control/qa-checklist:
 *   post:
 *     summary: Submit QA checklist
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: QA checklist submitted successfully
 */
router.post('/quality-control/qa-checklist', roleMiddleware(['lab_tech', 'admin']), labController.submitQAChecklist);

// Template routes
/**
 * @swagger
 * /api/lab/templates:
 *   get:
 *     summary: Get result templates
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 */
router.get('/templates', roleMiddleware(['lab_tech', 'admin']), cache({ ttl: 1800, keyPrefix: 'templates' }), labController.getResultTemplates);

/**
 * @swagger
 * /api/lab/templates:
 *   post:
 *     summary: Save result template
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Template saved successfully
 */
router.post('/templates', roleMiddleware(['lab_tech', 'admin']), labController.saveResultTemplate);

/**
 * @swagger
 * /api/lab/templates/{id}:
 *   delete:
 *     summary: Delete result template
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted successfully
 */
router.delete('/templates/:id', roleMiddleware(['admin']), labController.deleteResultTemplate);

// External lab integration routes
/**
 * @swagger
 * /api/lab/external-labs/configurations:
 *   get:
 *     summary: Get external lab configurations
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configurations retrieved successfully
 */
router.get('/external-labs/configurations', roleMiddleware(['admin']), labController.getExternalLabConfigurations);

/**
 * @swagger
 * /api/lab/external-labs/configurations:
 *   post:
 *     summary: Save external lab configuration
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Configuration saved successfully
 */
router.post('/external-labs/configurations', roleMiddleware(['admin']), labController.saveExternalLabConfig);

/**
 * @swagger
 * /api/lab/external-labs/{labId}/test-connection:
 *   post:
 *     summary: Test external lab connection
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: labId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Connection test completed
 */
router.post('/external-labs/:labId/test-connection', roleMiddleware(['admin']), labController.testExternalLabConnection);

/**
 * @swagger
 * /api/lab/external-labs/send-orders:
 *   post:
 *     summary: Send orders to external labs
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orders:
 *                 type: array
 *     responses:
 *       200:
 *         description: Orders sent successfully
 */
router.post('/external-labs/send-orders', roleMiddleware(['lab_tech', 'admin']), labController.sendOrdersToExternalLab);

/**
 * @swagger
 * /api/lab/external-labs/sync-results:
 *   post:
 *     summary: Sync results from external labs
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Results synced successfully
 */
router.post('/external-labs/sync-results', roleMiddleware(['lab_tech', 'admin']), labController.syncExternalLabResults);

/**
 * @swagger
 * /api/lab/external-labs/status:
 *   get:
 *     summary: Get external lab integration status
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 */
router.get('/external-labs/status', roleMiddleware(['lab_tech', 'admin']), cache({ ttl: 300, keyPrefix: 'external_labs' }), labController.getExternalLabStatus);

export default router;