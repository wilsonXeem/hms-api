import { Router } from 'express';
import {
  createAdmission,
  getAdmissions,
  getAdmissionById,
  dischargePatient,
  getAdmissionStats,
  transferPatient,
  getInpatientConsultations,
  createInpatientConsultation,
  calculateRoomCharges,
  createRoomCharges,
  getRoomCharges
} from '../controllers/admission.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', createAdmission);
router.get('/', getAdmissions);
router.get('/stats', getAdmissionStats);
router.get('/:id', getAdmissionById);
router.patch('/:id/discharge', dischargePatient);
router.patch('/:id/transfer', transferPatient);
router.get('/:id/consultations', getInpatientConsultations);
router.post('/:id/consultations', createInpatientConsultation);
router.get('/:id/charges/calculate', calculateRoomCharges);
router.post('/:id/charges', createRoomCharges);
router.get('/:id/charges', getRoomCharges);

export default router;