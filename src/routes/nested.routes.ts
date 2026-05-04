import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as patientController from '../controllers/patient.controller';
import * as vitalsController from '../controllers/vitals.controller';
import * as labController from '../controllers/lab.controller';
import * as admissionController from '../controllers/admission.controller';

const router = Router();

router.use(authMiddleware);

// Patient nested resources
router.get('/patients/:patientId/vitals', patientController.getPatientVitals);
router.post('/patients/:patientId/vitals', patientController.addPatientVitals);
router.get('/patients/:patientId/lab-results', labController.getLabResults);
router.get('/patients/:patientId/admissions', admissionController.getAdmissions);

// Admission nested resources
router.get('/admissions/:admissionId/charges', admissionController.getRoomCharges);
router.post('/admissions/:admissionId/charges', admissionController.createRoomCharges);

export default router;