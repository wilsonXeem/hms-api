import { Router } from 'express';
import * as scheduleController from '../controllers/schedule.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

router.use(authMiddleware);

const adminReception = roleMiddleware(['admin', 'receptionist']);

router.get('/',                scheduleController.getSchedules);
router.get('/doctors',         scheduleController.getDoctorsForSchedule);
router.get('/:doctorId',       scheduleController.getDoctorSchedule);
router.post('/',               adminReception, scheduleController.createSchedule);
router.put('/:id',             adminReception, scheduleController.updateSchedule);
router.delete('/:id',          adminReception, scheduleController.deleteSchedule);
router.patch('/:id/toggle',    adminReception, scheduleController.toggleSchedule);

export default router;
