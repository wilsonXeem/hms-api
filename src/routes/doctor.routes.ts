import { Router } from 'express';
import * as doctorController from '../controllers/doctor.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Doctor
 *   description: Doctor operations including consultations, prescriptions, and vitals
 */

// Apply auth middleware
router.use(authMiddleware);

// Dashboard routes
router.get('/dashboard', roleMiddleware(['doctor']), doctorController.getDoctorDashboard);
router.get('/stats', roleMiddleware(['doctor']), doctorController.getDoctorStats);
router.get('/schedule', roleMiddleware(['doctor']), doctorController.getDoctorSchedule);

// Consultation routes (doctor role required)
/**
 * @swagger
 * /api/doctors/consultations:
 *   post:
 *     summary: Create a new consultation
 *     tags: [Doctor]
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
 *               - chiefComplaint
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               chiefComplaint:
 *                 type: string
 *                 example: Chest pain and shortness of breath
 *               diagnosis:
 *                 type: string
 *                 example: Acute myocardial infarction
 *               treatment:
 *                 type: string
 *                 example: Prescribed medication and bed rest
 *               followUpDate:
 *                 type: string
 *                 format: date
 *                 example: 2024-02-15
 *     responses:
 *       201:
 *         description: Consultation created successfully
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
 *                         consultation:
 *                           $ref: '#/components/schemas/Consultation'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions (Doctor role required)
 */
router.post('/consultations', roleMiddleware(['doctor']), doctorController.createConsultation);

/**
 * @swagger
 * /api/doctors/consultations:
 *   get:
 *     summary: Get doctor's consultations
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by patient ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, in_progress, completed, cancelled]
 *         description: Filter by consultation status
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by consultation date
 *     responses:
 *       200:
 *         description: Consultations retrieved successfully
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
 *                         consultations:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Consultation'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/consultations', roleMiddleware(['doctor']), doctorController.getConsultations);
router.get('/consultations/:id', roleMiddleware(['doctor']), doctorController.getConsultationDetails);
router.put('/consultations/:id', roleMiddleware(['doctor']), doctorController.updateConsultation);

// Prescription routes (doctor role required)
/**
 * @swagger
 * /api/doctors/prescriptions:
 *   post:
 *     summary: Create a new prescription
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - consultationId
 *               - items
 *             properties:
 *               consultationId:
 *                 type: string
 *                 format: uuid
 *               remarks:
 *                 type: string
 *                 example: Take with food
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - drugName
 *                     - dosage
 *                     - frequency
 *                     - duration
 *                   properties:
 *                     drugName:
 *                       type: string
 *                       example: Paracetamol
 *                     dosage:
 *                       type: string
 *                       example: 500mg
 *                     frequency:
 *                       type: string
 *                       example: Twice daily
 *                     duration:
 *                       type: string
 *                       example: 7 days
 *                     quantityPrescribed:
 *                       type: number
 *                       example: 14
 *     responses:
 *       201:
 *         description: Prescription created successfully
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
 *                         prescription:
 *                           $ref: '#/components/schemas/Prescription'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/prescriptions', roleMiddleware(['doctor']), doctorController.createPrescription);
router.get('/prescriptions/:id', roleMiddleware(['doctor']), doctorController.getPrescriptionDetails);
router.put('/prescriptions/:id', roleMiddleware(['doctor']), doctorController.updatePrescription);
router.put('/prescriptions/:id/cancel', roleMiddleware(['doctor']), doctorController.cancelPrescription);

/**
 * @swagger
 * /api/doctors/prescriptions:
 *   get:
 *     summary: Get doctor's prescriptions
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by patient ID
 *       - in: query
 *         name: consultationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by consultation ID
 *     responses:
 *       200:
 *         description: Prescriptions retrieved successfully
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
 *                         prescriptions:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Prescription'
 */
router.get('/prescriptions', roleMiddleware(['doctor']), doctorController.getPrescriptions);

// Appointment routes
router.post('/appointments', roleMiddleware(['doctor', 'admin']), doctorController.createAppointment);
router.get('/appointments', roleMiddleware(['doctor']), doctorController.getDoctorAppointments);
router.put('/appointments/:id/status', roleMiddleware(['doctor']), doctorController.updateAppointmentStatus);

// Vitals routes (doctor/nurse roles)
/**
 * @swagger
 * /api/doctors/vitals:
 *   post:
 *     summary: Record patient vitals
 *     tags: [Doctor]
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
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               bloodPressureSystolic:
 *                 type: number
 *                 example: 120
 *               bloodPressureDiastolic:
 *                 type: number
 *                 example: 80
 *               heartRate:
 *                 type: number
 *                 example: 72
 *               temperature:
 *                 type: number
 *                 example: 98.6
 *               respiratoryRate:
 *                 type: number
 *                 example: 16
 *               oxygenSaturation:
 *                 type: number
 *                 example: 98
 *               weight:
 *                 type: number
 *                 example: 70.5
 *               height:
 *                 type: number
 *                 example: 175
 *     responses:
 *       201:
 *         description: Vitals recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions (Doctor or nurse role required)
 */
router.post('/vitals', roleMiddleware(['doctor', 'nurse']), doctorController.recordVitals);

/**
 * @swagger
 * /api/doctors/vitals/{patientId}:
 *   get:
 *     summary: Get patient vitals history
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Patient ID
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter vitals from this date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter vitals to this date
 *     responses:
 *       200:
 *         description: Patient vitals retrieved successfully
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
 *                         vitals:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               bloodPressureSystolic:
 *                                 type: number
 *                               bloodPressureDiastolic:
 *                                 type: number
 *                               heartRate:
 *                                 type: number
 *                               temperature:
 *                                 type: number
 *                               recordedAt:
 *                                 type: string
 *                                 format: date-time
 *       404:
 *         description: Patient not found
 */
router.get('/vitals/:patientId', doctorController.getPatientVitals);

// Drug search
router.get('/drugs/search', roleMiddleware(['doctor']), doctorController.searchDrugs);

// Patient management
router.get('/patients/:patientId/history', roleMiddleware(['doctor']), doctorController.getPatientHistory);

// Lab requests
router.post('/lab-requests', roleMiddleware(['doctor']), doctorController.createLabRequestFromConsultation);

// Lab results
router.get('/lab-results', roleMiddleware(['doctor']), doctorController.getDoctorLabResults);
router.get('/lab-results/:id', roleMiddleware(['doctor']), doctorController.getDoctorLabResultById);

export default router;
