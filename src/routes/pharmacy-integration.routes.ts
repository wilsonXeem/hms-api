import { Router } from 'express';
import { PharmacyIntegrationController } from '../controllers/pharmacy-integration.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Send prescription to pharmacy
router.post('/prescriptions/:prescriptionId/send', 
  roleMiddleware(['doctor', 'nurse', 'pharmacist']),
  PharmacyIntegrationController.sendPrescriptionToPharmacy
);

// Check medication availability
router.get('/medications/:ndc/availability',
  roleMiddleware(['doctor', 'nurse', 'pharmacist']),
  PharmacyIntegrationController.checkMedicationAvailability
);

// Get prescription status from pharmacy
router.get('/prescriptions/:pharmacyOrderId/status',
  roleMiddleware(['doctor', 'nurse', 'pharmacist', 'patient']),
  PharmacyIntegrationController.getPrescriptionStatus
);

// Search medications across pharmacies
router.get('/medications/search',
  roleMiddleware(['doctor', 'nurse', 'pharmacist']),
  PharmacyIntegrationController.searchMedications
);

// Get pharmacy locations
router.get('/locations',
  PharmacyIntegrationController.getPharmacyLocations
);

// Transfer prescription between pharmacies
router.post('/prescriptions/:prescriptionId/transfer',
  roleMiddleware(['doctor', 'pharmacist', 'patient']),
  PharmacyIntegrationController.transferPrescription
);

// Get available pharmacy providers
router.get('/providers',
  PharmacyIntegrationController.getAvailableProviders
);

// Bulk prescription submission
router.post('/prescriptions/bulk-submit',
  roleMiddleware(['doctor', 'nurse', 'pharmacist']),
  PharmacyIntegrationController.bulkPrescriptionSubmission
);

export default router;