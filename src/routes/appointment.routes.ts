import { Router } from 'express';
import * as appointmentController from '../controllers/appointment.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { addFacilityContext } from '../middleware/facility.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Appointment scheduling and management
 */

router.use(authMiddleware);
router.use(addFacilityContext);

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Schedule a new appointment
 *     tags: [Appointments]
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
 *               - doctorId
 *               - appointmentDate
 *               - appointmentTime
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               doctorId:
 *                 type: string
 *                 format: uuid
 *               appointmentDate:
 *                 type: string
 *                 format: date
 *               appointmentTime:
 *                 type: string
 *                 example: "14:30"
 *               reason:
 *                 type: string
 *               duration:
 *                 type: string
 *                 example: "30 minutes"
 *     responses:
 *       201:
 *         description: Appointment scheduled successfully
 *       409:
 *         description: Time slot conflict
 */
router.post('/', appointmentController.createAppointment);

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Get appointments
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: doctorId
 *         schema:
 *           type: string
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, completed, cancelled, no_show]
 *     responses:
 *       200:
 *         description: Appointments retrieved successfully
 */
router.get('/', appointmentController.getAppointments);
router.get('/doctors', appointmentController.getDoctorsList);
router.get('/auto-assign', appointmentController.getAutoAssignedDoctor);
/**
 * @swagger
 * /api/appointments/{id}/status:
 *   put:
 *     summary: Update appointment status
 *     tags: [Appointments]
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
 *                 enum: [scheduled, completed, cancelled, no_show]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.put('/:id/status', roleMiddleware(['doctor', 'nurse', 'receptionist']), appointmentController.updateAppointmentStatus);

/**
 * @swagger
 * /api/appointments/availability/{doctorId}/{date}:
 *   get:
 *     summary: Get doctor availability for a specific date
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Availability retrieved successfully
 */
router.get('/availability/:doctorId/:date', appointmentController.getDoctorAvailability);

/**
 * @swagger
 * /api/appointments/{id}/reschedule:
 *   put:
 *     summary: Reschedule an appointment
 *     tags: [Appointments]
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
 *               - newDate
 *               - newTime
 *             properties:
 *               newDate:
 *                 type: string
 *                 format: date
 *               newTime:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appointment rescheduled successfully
 *       404:
 *         description: Appointment not found
 */
router.put('/:id/reschedule', roleMiddleware(['doctor', 'nurse', 'receptionist']), appointmentController.rescheduleAppointment);

/**
 * @swagger
 * /api/appointments/{id}/cancel:
 *   put:
 *     summary: Cancel an appointment
 *     tags: [Appointments]
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appointment cancelled successfully
 *       404:
 *         description: Appointment not found
 */
router.put('/:id/cancel', roleMiddleware(['doctor', 'nurse', 'receptionist']), appointmentController.cancelAppointment);

/**
 * @swagger
 * /api/appointments/upcoming:
 *   get:
 *     summary: Get upcoming appointments
 *     tags: [Appointments]
 */
router.get('/upcoming', appointmentController.getUpcomingAppointments);

/**
 * @swagger
 * /api/appointments/reminders:
 *   post:
 *     summary: Send appointment reminders
 *     tags: [Appointments]
 */
router.post('/reminders', roleMiddleware(['admin', 'receptionist']), appointmentController.sendAppointmentReminders);

/**
 * @swagger
 * /api/appointments/recurring:
 *   post:
 *     summary: Create recurring appointments
 *     tags: [Appointments]
 */
router.post('/recurring', roleMiddleware(['doctor', 'nurse', 'receptionist']), appointmentController.createRecurringAppointment);

/**
 * @swagger
 * /api/appointments/slots:
 *   get:
 *     summary: Get available appointment slots
 *     tags: [Appointments]
 */
router.get('/slots', appointmentController.getAppointmentSlots);

/**
 * @swagger
 * /api/appointments/bulk-update:
 *   put:
 *     summary: Bulk update appointments
 *     tags: [Appointments]
 */
router.put('/bulk-update', roleMiddleware(['admin', 'doctor', 'receptionist']), appointmentController.bulkUpdateAppointments);

export default router;