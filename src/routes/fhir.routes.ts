import { Router } from 'express';
import { FHIRController } from '../controllers/fhir.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

// FHIR Capability Statement (public endpoint)
router.get('/metadata', FHIRController.getCapabilityStatement);

// Apply authentication to all other FHIR endpoints
router.use(authMiddleware);

// Patient FHIR resources
router.get('/Patient/:patientId', 
  roleMiddleware(['doctor', 'nurse', 'admin']), 
  FHIRController.getPatientFHIR
);

router.post('/Patient/:patientId/export', 
  roleMiddleware(['doctor', 'admin']), 
  FHIRController.exportPatientToFHIR
);

router.post('/Patient/import/:fhirPatientId', 
  roleMiddleware(['admin']), 
  FHIRController.importPatientFromFHIR
);

// Lab result FHIR resources
router.get('/Observation/:resultId', 
  roleMiddleware(['doctor', 'nurse', 'lab-tech', 'admin']), 
  FHIRController.getLabResultFHIR
);

router.post('/Patient/:patientId/lab-results/export', 
  roleMiddleware(['doctor', 'lab-tech', 'admin']), 
  FHIRController.exportLabResultsToFHIR
);

// FHIR resource search
router.get('/:resourceType', 
  roleMiddleware(['doctor', 'nurse', 'admin']), 
  FHIRController.searchFHIRResources
);

// FHIR resource validation
router.post('/validate', 
  roleMiddleware(['admin', 'developer']), 
  FHIRController.validateFHIRResource
);

export default router;