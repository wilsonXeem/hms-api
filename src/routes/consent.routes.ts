import { Router } from 'express';
import { consentController } from '../controllers/consent.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { auditMiddleware } from '../middleware/audit.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', 
  auditMiddleware('RECORD_CONSENT', 'patient_consent'),
  consentController.recordConsent
);

router.delete('/:consentId', 
  auditMiddleware('REVOKE_CONSENT', 'patient_consent'),
  consentController.revokeConsent
);

router.get('/:patientId/:consentType', 
  consentController.checkConsent
);

export { router as consentRoutes };