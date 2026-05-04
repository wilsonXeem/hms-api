import { Router } from 'express';
import { dataRetentionController } from '../controllers/data-retention.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { validationMiddleware } from '../middleware/validation.middleware';
import { body } from 'express-validator';

const router = Router();

// Validation schemas
const createPolicyValidation = [
  body('name').notEmpty().withMessage('Policy name is required'),
  body('dataType').isIn(['patient_records', 'audit_logs', 'reports', 'documents', 'all']).withMessage('Invalid data type'),
  body('retentionPeriod').isInt({ min: 1 }).withMessage('Retention period must be a positive integer'),
  body('unit').isIn(['days', 'months', 'years']).withMessage('Invalid time unit'),
  body('autoDelete').isBoolean().withMessage('Auto delete must be boolean'),
  body('archiveBeforeDelete').isBoolean().withMessage('Archive before delete must be boolean')
];

const executeRetentionValidation = [
  body('policyId').optional().isUUID().withMessage('Invalid policy ID'),
  body('dryRun').optional().isBoolean().withMessage('Dry run must be boolean')
];

// Routes (Admin only)
router.post('/', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  createPolicyValidation,
  validationMiddleware,
  dataRetentionController.createPolicy
);

router.get('/', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  dataRetentionController.getPolicies
);

router.get('/:id', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  dataRetentionController.getPolicy
);

router.put('/:id', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  validationMiddleware,
  dataRetentionController.updatePolicy
);

router.delete('/:id', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  dataRetentionController.deletePolicy
);

router.post('/execute', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  executeRetentionValidation,
  validationMiddleware,
  dataRetentionController.executeRetention
);

export default router;