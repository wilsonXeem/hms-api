import { Router } from 'express';
import { PublicController } from '../controllers/public.controller';
import { validateContactSubmission, validatePublicBooking } from '../middleware/validation.middleware';
import { publicContactLimiter, publicBookingLimiter, publicInfoLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

router.get('/facility-info', publicInfoLimiter, PublicController.getFacilityInfo);
router.post('/contact', publicContactLimiter, validateContactSubmission, PublicController.submitContact);
router.post('/book-appointment', publicBookingLimiter, validatePublicBooking, PublicController.bookAppointment);
router.get('/doctors', publicInfoLimiter, PublicController.getAvailableDoctors);
router.get('/services', publicInfoLimiter, PublicController.getHospitalServices);
router.get('/available-slots', publicInfoLimiter, PublicController.getAvailableSlots);

export default router;