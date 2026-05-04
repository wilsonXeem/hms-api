import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing and management
 */

// Apply auth middleware
router.use(authMiddleware);

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Create a new payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', paymentController.createPayment);

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Get payments
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', paymentController.getPayments);

/**
 * @swagger
 * /api/payments/reference/{referenceCode}:
 *   get:
 *     summary: Get payment by reference code
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/reference/:referenceCode', paymentController.getPaymentByReference);

/**
 * @swagger
 * /api/payments/{id}/verify:
 *   put:
 *     summary: Verify payment (admin/receptionist only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id/verify', roleMiddleware(['admin', 'receptionist']), paymentController.verifyPayment);

/**
 * @swagger
 * /api/payments/{id}/status:
 *   put:
 *     summary: Update payment status (admin/receptionist only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id/status', roleMiddleware(['admin', 'receptionist']), paymentController.updatePaymentStatus);

/**
 * @swagger
 * /api/payments/process:
 *   post:
 *     summary: Process payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/process', paymentController.processPayment);

/**
 * @swagger
 * /api/payments/{id}/receipt:
 *   get:
 *     summary: Generate receipt
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/receipt', paymentController.generateReceipt);

/**
 * @swagger
 * /api/payments/summary:
 *   get:
 *     summary: Get payment summary
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/summary', paymentController.getPaymentSummary);

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get payment by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', paymentController.getPaymentById);

/**
 * @swagger
 * /api/payments/{id}/refund:
 *   post:
 *     summary: Refund payment (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/refund', roleMiddleware(['admin']), paymentController.refundPayment);

/**
 * @swagger
 * /api/payments/intent:
 *   post:
 *     summary: Create payment intent
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/intent', paymentController.createPaymentIntent);

/**
 * @swagger
 * /api/payments/confirm:
 *   post:
 *     summary: Confirm payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/confirm', paymentController.confirmPayment);

/**
 * @swagger
 * /api/payments/gateways:
 *   get:
 *     summary: Get supported payment gateways
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/gateways', paymentController.getSupportedGateways);

export default router;