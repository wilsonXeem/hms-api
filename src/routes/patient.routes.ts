import { Router } from 'express';
import * as patientController from '../controllers/patient.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body, param, query } from 'express-validator';

const router = Router();

router.use(authMiddleware);

// ── Create patient ──────────────────────────────────────────────────────────
router.post('/', [
  body('firstName').notEmpty().trim().withMessage('First name is required'),
  body('lastName').notEmpty().trim().withMessage('Last name is required'),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('dob').optional().isISO8601(),
  body('email').optional().isEmail().normalizeEmail(),
  validateRequest
], patientController.createPatient);

// ── Get all patients ────────────────────────────────────────────────────────
router.get('/', [
  query('search').optional().trim().isLength({ max: 100 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  validateRequest
], patientController.getPatients);

// ── Stats ───────────────────────────────────────────────────────────────────
router.get('/stats/overview', patientController.getPatientStats);

// ── Search ──────────────────────────────────────────────────────────────────
router.get('/search', patientController.getPatients);

// ── Get by ID ───────────────────────────────────────────────────────────────
router.get('/:id', [
  param('id').isUUID().withMessage('Valid patient ID required'),
  validateRequest
], patientController.getPatientById);

// ── Update patient ──────────────────────────────────────────────────────────
router.put('/:id', [
  param('id').isUUID().withMessage('Valid patient ID required'),
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('email').optional().isEmail().normalizeEmail(),
  validateRequest
], patientController.updatePatient);

// ── Medical history ─────────────────────────────────────────────────────────
router.get('/:id/medical-history', [
  param('id').isUUID().withMessage('Valid patient ID required'),
  validateRequest
], patientController.getPatientMedicalHistory);

// ── Vitals ──────────────────────────────────────────────────────────────────
router.post('/:id/vitals', [
  param('id').isUUID().withMessage('Valid patient ID required'),
  body('bloodPressureSystolic').optional().isInt({ min: 50, max: 300 }),
  body('bloodPressureDiastolic').optional().isInt({ min: 30, max: 200 }),
  body('heartRate').optional().isInt({ min: 30, max: 250 }),
  body('temperature').optional().isFloat({ min: 30, max: 50 }),
  body('respiratoryRate').optional().isInt({ min: 5, max: 60 }),
  body('oxygenSaturation').optional().isInt({ min: 50, max: 100 }),
  body('weight').optional().isFloat({ min: 0.5, max: 500 }),
  body('height').optional().isFloat({ min: 30, max: 300 }),
  validateRequest
], patientController.addPatientVitals);

router.get('/:id/vitals', [
  param('id').isUUID().withMessage('Valid patient ID required'),
  validateRequest
], patientController.getPatientVitals);

// ── Allergies ───────────────────────────────────────────────────────────────
router.post('/:id/allergies', [
  param('id').isUUID().withMessage('Valid patient ID required'),
  body('allergen').notEmpty().trim().isLength({ min: 1, max: 100 }),
  body('severity').isIn(['mild', 'moderate', 'severe']),
  validateRequest
], patientController.addPatientAllergy);

// ── Conditions ──────────────────────────────────────────────────────────────
router.post('/:id/conditions', [
  param('id').isUUID().withMessage('Valid patient ID required'),
  body('condition').notEmpty().trim().isLength({ min: 1, max: 200 }),
  body('diagnosedDate').optional().isISO8601(),
  validateRequest
], patientController.addPatientCondition);

export default router;
