import { Request, Response, NextFunction } from 'express';
import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { db } from '../config/db.config';
import { payments } from '../models/payments.model';
import { patients } from '../models/patients.model';
import { successResponse, errorResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';
import { paymentService } from '../services/payment.service';
import { paymentGatewayService } from '../services/payment-gateway.service';
import { validateRequired } from '../utils/errors.util';

export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId, department, amount, method } = req.body;
    
    // Generate reference code
    const referenceCode = `PAY${Date.now()}`;

    const [payment] = await db.insert(payments).values({
      patientId,
      department,
      referenceCode,
      amount,
      method,
      status: 'pending'
    }).returning();

    logger.info(`Payment created: ${payment.id} for patient ${patientId}`);
    successResponse(res, 'Payment created successfully', { payment }, 201);
  } catch (error) {
    logger.error('Create payment error:', error);
    next(error);
  }
};

export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { patientId, status, limit = 50, offset = 0 } = req.query;

    const conditions: any[] = [eq(payments.facilityId, facilityId)];
    if (patientId) conditions.push(eq(payments.patientId, patientId as string));
    if (status) conditions.push(eq(payments.status, status as string));

    const paymentList = await db.select({
      id: payments.id,
      patientId: payments.patientId,
      admissionId: payments.admissionId,
      department: payments.department,
      referenceCode: payments.referenceCode,
      amount: payments.amount,
      method: payments.method,
      status: payments.status,
      patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
      patientCode: patients.patientCode,
      createdAt: sql<string>`to_char(${payments.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`
    })
    .from(payments)
    .leftJoin(patients, eq(payments.patientId, patients.id))
    .where(and(...conditions))
    .orderBy(desc(payments.createdAt))
    .limit(Number(limit)).offset(Number(offset));

    successResponse(res, 'Payments retrieved successfully', { payments: paymentList });
  } catch (error) {
    logger.error('Get payments error:', error);
    next(error);
  }
};

export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const approvedBy = req.user!.id;
    const { id } = req.params;
    const { status } = req.body; // approved, rejected

    const [updatedPayment] = await db.update(payments)
      .set({ status, approvedBy })
      .where(eq(payments.id, id))
      .returning();

    if (!updatedPayment) {
      return errorResponse(res, 'Payment not found', undefined, 404);
    }

    logger.info(`Payment ${status}: ${id} by ${approvedBy}`);
    successResponse(res, `Payment ${status} successfully`, { payment: updatedPayment });
  } catch (error) {
    logger.error('Verify payment error:', error);
    next(error);
  }
};

export const getPaymentByReference = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { referenceCode } = req.params;

    const [payment] = await db.select().from(payments)
      .where(eq(payments.referenceCode, referenceCode)).limit(1);

    if (!payment) {
      return errorResponse(res, 'Payment not found', undefined, 404);
    }

    successResponse(res, 'Payment retrieved successfully', { payment });
  } catch (error) {
    logger.error('Get payment by reference error:', error);
    next(error);
  }
};

export const updatePaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const [updatedPayment] = await db.update(payments)
      .set({ status })
      .where(eq(payments.id, id))
      .returning();

    if (!updatedPayment) {
      return errorResponse(res, 'Payment not found', undefined, 404);
    }

    logger.info(`Payment status updated: ${id} to ${status}`);
    successResponse(res, 'Payment status updated successfully', { payment: updatedPayment });
  } catch (error) {
    logger.error('Update payment status error:', error);
    next(error);
  }
};

export const processPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentId, paymentMethod, gateway = 'paystack', transactionId } = req.body;

    const [updatedPayment] = await paymentService.processPayment(paymentId, paymentMethod, gateway, transactionId);

    if (!updatedPayment) {
      return errorResponse(res, 'Payment not found', undefined, 404);
    }

    logger.info(`Payment processed: ${paymentId} - ${updatedPayment.status}`);
    successResponse(res, `Payment ${updatedPayment.status}`, { payment: updatedPayment });
  } catch (error) {
    logger.error('Process payment error:', error);
    next(error);
  }
};

export const generateReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const paymentDetails = await db.select({
      paymentId: payments.id,
      referenceCode: payments.referenceCode,
      amount: payments.amount,
      method: payments.method,
      status: payments.status,
      department: payments.department,
      createdAt: payments.createdAt,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      patientCode: patients.patientCode
    })
    .from(payments)
    .leftJoin(patients, eq(payments.patientId, patients.id))
    .where(eq(payments.id, id))
    .limit(1);

    if (paymentDetails.length === 0) {
      return errorResponse(res, 'Payment not found', undefined, 404);
    }

    const receipt = {
      ...paymentDetails[0],
      receiptNumber: `RCP${Date.now()}`,
      generatedAt: new Date().toISOString()
    };

    successResponse(res, 'Receipt generated successfully', { receipt });
  } catch (error) {
    logger.error('Generate receipt error:', error);
    next(error);
  }
};

export const getPaymentSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { startDate, endDate } = req.query;

    const summary = await db.select({
      totalPayments: sql<number>`COUNT(*)`,
      totalAmount: sql<number>`SUM(${payments.amount})`,
      completedPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'completed' THEN 1 END)`,
      pendingPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'pending' THEN 1 END)`,
      failedPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'failed' THEN 1 END)`
    })
    .from(payments)
    .leftJoin(patients, eq(payments.patientId, patients.id))
    .where(and(
      eq(patients.facilityId, facilityId),
      startDate ? gte(payments.createdAt, new Date(startDate as string)) : sql`true`,
      endDate ? lte(payments.createdAt, new Date(endDate as string)) : sql`true`
    ));

    successResponse(res, 'Payment summary retrieved', { summary: summary[0] });
  } catch (error) {
    logger.error('Get payment summary error:', error);
    next(error);
  }
};

export const getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const [payment] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);

    if (!payment) {
      return errorResponse(res, 'Payment not found', undefined, 404);
    }

    successResponse(res, 'Payment retrieved successfully', { payments: [payment] });
  } catch (error) {
    logger.error('Get payment by ID error:', error);
    next(error);
  }
};

export const createPaymentIntent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, currency = 'NGN', gateway = 'paystack', metadata } = req.body;

    const paymentIntent = await paymentService.createPaymentIntent(amount, currency, gateway, metadata);

    logger.info(`Payment intent created: ${paymentIntent.id}`);
    successResponse(res, 'Payment intent created successfully', { paymentIntent });
  } catch (error) {
    logger.error('Create payment intent error:', error);
    next(error);
  }
};

export const confirmPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentIntentId, paymentMethod, gateway = 'paystack' } = req.body;

    const result = await paymentService.confirmPayment(paymentIntentId, paymentMethod, gateway);

    logger.info(`Payment confirmed: ${paymentIntentId} - ${result.status}`);
    successResponse(res, 'Payment confirmed', { result });
  } catch (error) {
    logger.error('Confirm payment error:', error);
    next(error);
  }
};

export const getSupportedGateways = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gateways = paymentGatewayService.getSupportedProviders();
    successResponse(res, 'Supported payment gateways', { gateways });
  } catch (error) {
    logger.error('Get supported gateways error:', error);
    next(error);
  }
};

export const refundPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { refundAmount, reason, gateway = 'paystack' } = req.body;
    const processedBy = req.user!.id;

    const [payment] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    
    if (!payment) {
      return errorResponse(res, 'Payment not found', undefined, 404);
    }

    if (payment.status !== 'completed') {
      return errorResponse(res, 'Only completed payments can be refunded', undefined, 400);
    }

    const [updatedPayment] = await paymentService.refundPayment(
      id, 
      refundAmount || payment.amount, 
      reason, 
      processedBy,
      gateway
    );

    logger.info(`Payment refunded: ${id} by ${processedBy}`);
    successResponse(res, 'Payment refunded successfully', { payment: updatedPayment });
  } catch (error) {
    logger.error('Refund payment error:', error);
    next(error);
  }
};