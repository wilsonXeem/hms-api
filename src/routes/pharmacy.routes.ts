import { Router } from 'express';
import * as pharmacyController from '../controllers/pharmacy.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { addFacilityContext } from '../middleware/facility.middleware';
import { cache, inventoryCache, patientCache } from '../middleware/cache.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Pharmacy
 *   description: Pharmacy operations and medication management
 */

// Apply auth and facility middleware
router.use(authMiddleware);
router.use(addFacilityContext);

// Dashboard
router.get('/dashboard/stats', roleMiddleware(['pharmacist', 'admin']), pharmacyController.getDashboardStats);

// Prescription management
/**
 * @swagger
 * /api/pharmacy/prescriptions:
 *   get:
 *     summary: Get pending prescriptions
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending prescriptions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/prescriptions', inventoryCache, pharmacyController.getPendingPrescriptions);
/**
 * @swagger
 * /api/pharmacy/prescriptions/{prescriptionId}/verify:
 *   get:
 *     summary: Verify prescription (pharmacist only)
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: prescriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Prescription verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/prescriptions/:prescriptionId/verify', roleMiddleware(['pharmacist']), pharmacyController.verifyPrescription);
/**
 * @swagger
 * /api/pharmacy/prescriptions/{prescriptionId}/validate:
 *   get:
 *     summary: Validate prescription
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: prescriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Prescription validation result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/prescriptions/:prescriptionId/validate', pharmacyController.validatePrescription);
/**
 * @swagger
 * /api/pharmacy/dispensations/partial:
 *   get:
 *     summary: Get partial dispensations (pharmacist only)
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Partial dispensations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/dispensations/partial', roleMiddleware(['pharmacist']), pharmacyController.getPartialDispensations);

// Dispensation (pharmacist only)
/**
 * @swagger
 * /api/pharmacy/dispense:
 *   post:
 *     summary: Dispense medication (pharmacist only)
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prescriptionId
 *               - items
 *             properties:
 *               prescriptionId:
 *                 type: string
 *                 format: uuid
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     drugName:
 *                       type: string
 *                     quantityDispensed:
 *                       type: number
 *                     batchNumber:
 *                       type: string
 *     responses:
 *       201:
 *         description: Medication dispensed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post('/dispense', roleMiddleware(['pharmacist']), pharmacyController.dispenseMedication);
/**
 * @swagger
 * /api/pharmacy/dispensations:
 *   get:
 *     summary: Get dispensation history (pharmacist only)
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dispensation history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/dispensations', roleMiddleware(['pharmacist']), inventoryCache, pharmacyController.getDispensationHistory);
/**
 * @swagger
 * /api/pharmacy/dispensations/patient/{patientId}:
 *   get:
 *     summary: Get dispensations by patient
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Patient dispensations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/dispensations/patient/:patientId', patientCache, pharmacyController.getDispensationsByPatient);

// Drug safety
/**
 * @swagger
 * /api/pharmacy/drugs/interactions:
 *   post:
 *     summary: Check drug interactions
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - drugs
 *             properties:
 *               drugs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["aspirin", "warfarin"]
 *     responses:
 *       200:
 *         description: Drug interaction check completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post('/drugs/interactions', pharmacyController.checkDrugInteractions);
/**
 * @swagger
 * /api/pharmacy/drugs/{drugName}/availability:
 *   get:
 *     summary: Check drug availability
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: drugName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Drug availability information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/drugs/:drugName/availability', inventoryCache, pharmacyController.checkDrugAvailability);
/**
 * @swagger
 * /api/pharmacy/drugs/expiring:
 *   get:
 *     summary: Get expiring drugs
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: number
 *           default: 30
 *         description: Number of days to check for expiring drugs
 *     responses:
 *       200:
 *         description: Expiring drugs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/drugs/expiring', inventoryCache, pharmacyController.getExpiringDrugs);

export default router;