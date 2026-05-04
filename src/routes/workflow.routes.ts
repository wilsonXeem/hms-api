import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import {
  registerPatientWithAppointment,
  completeConsultation,
  dispensePrescription,
  createBillForConsultation,
  processLabResult,
  scheduleAppointment,
  processEmergencyPatient
} from '../controllers/workflow.controller';

const router = Router();

// All workflow routes require authentication
router.use(authMiddleware);

// Patient registration with appointment
router.post('/register-patient-appointment', 
  roleMiddleware(['admin', 'receptionist', 'nurse']), 
  registerPatientWithAppointment
);

// Complete consultation workflow
router.post('/complete-consultation', 
  roleMiddleware(['doctor']), 
  completeConsultation
);

// Prescription dispensation workflow
router.post('/dispense-prescription/:prescriptionId', 
  roleMiddleware(['pharmacist']), 
  dispensePrescription
);

// Billing workflow
router.post('/create-bill/:consultationId', 
  roleMiddleware(['admin', 'receptionist']), 
  createBillForConsultation
);

// Lab result processing workflow
router.post('/process-lab-result/:requestId', 
  roleMiddleware(['lab_tech', 'doctor']), 
  processLabResult
);

// Appointment scheduling with availability check
router.post('/schedule-appointment', 
  roleMiddleware(['admin', 'receptionist', 'doctor']), 
  scheduleAppointment
);

// Emergency patient processing
router.post('/emergency-patient', 
  roleMiddleware(['doctor', 'nurse', 'admin']), 
  processEmergencyPatient
);

export default router;