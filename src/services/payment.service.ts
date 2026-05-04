import { db } from '../config/db.config';
import { payments } from '../models/payments.model';
import { patients } from '../models/patients.model';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { paymentGatewayService } from './payment-gateway.service';
import { logger } from '../utils/logger.util';

export class PaymentService {
  async createPayment(data: any) {
    const referenceCode = `PAY${Date.now()}`;
    return await db.insert(payments).values({
      ...data,
      referenceCode,
      status: 'pending'
    }).returning();
  }

  async getPayments(filters: any) {
    const conditions = [];
    if (filters.patientId) conditions.push(eq(payments.patientId, filters.patientId));
    if (filters.status) conditions.push(eq(payments.status, filters.status));
    
    return await db.select().from(payments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);
  }

  async getPaymentById(id: string) {
    return await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  }

  async getPaymentByReference(referenceCode: string) {
    return await db.select().from(payments).where(eq(payments.referenceCode, referenceCode)).limit(1);
  }

  async updatePaymentStatus(id: string, status: string, additionalData?: any) {
    return await db.update(payments)
      .set({ status, ...additionalData })
      .where(eq(payments.id, id))
      .returning();
  }

  async processPayment(paymentId: string, paymentMethod: any, gateway: string = 'paystack', transactionId?: string) {
    try {
      // Get payment details
      const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
      if (!payment) {
        throw new Error('Payment not found');
      }

      let result;
      
      // Handle manual payment methods
      if (paymentMethod === 'cash' || paymentMethod === 'transfer') {
        result = {
          success: true,
          transactionId: `MANUAL_${Date.now()}`,
          status: 'pending', // Requires manual approval
          message: `${paymentMethod} payment recorded - awaiting approval`
        };
      } else {
        // Process through Paystack gateway
        result = await paymentGatewayService.processPayment(
          gateway,
          Number(payment.amount),
          'NGN',
          paymentMethod,
          {
            paymentId,
            patientId: payment.patientId,
            department: payment.department
          }
        );
      }

      // Update payment with gateway response
      return await this.updatePaymentStatus(paymentId, result.status, {
        method: typeof paymentMethod === 'string' ? paymentMethod : paymentMethod.type,
        transactionId: result.transactionId,
        gatewayProvider: gateway,
        gatewayResponse: result.gatewayResponse ? JSON.stringify(result.gatewayResponse) : null,
        processedAt: new Date()
      });
    } catch (error: any) {
      logger.error('Payment processing error:', error);
      return await this.updatePaymentStatus(paymentId, 'failed', {
        method: typeof paymentMethod === 'string' ? paymentMethod : paymentMethod.type,
        transactionId: transactionId || `FAILED_${Date.now()}`,
        errorMessage: error.message
      });
    }
  }

  async getPaymentSummary(facilityId: string, startDate?: Date, endDate?: Date) {
    return await db.select({
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
      startDate ? gte(payments.createdAt, startDate) : sql`true`,
      endDate ? lte(payments.createdAt, endDate) : sql`true`
    ));
  }

  async refundPayment(id: string, refundAmount: number, reason: string, refundedBy: string, gateway: string = 'paystack') {
    try {
      // Get payment details
      const [payment] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (!payment.transactionId) {
        throw new Error('No transaction ID found for refund');
      }

      // Process refund through gateway
      const refundResult = await paymentGatewayService.refundPayment(
        gateway,
        payment.transactionId,
        refundAmount
      );

      if (!refundResult.success) {
        throw new Error('Gateway refund failed');
      }

      // Update payment with refund details
      return await this.updatePaymentStatus(id, 'refunded', {
        refundAmount,
        refundReason: reason,
        refundedBy,
        refundedAt: new Date(),
        refundTransactionId: refundResult.refundId
      });
    } catch (error: any) {
      logger.error('Payment refund error:', error);
      throw error;
    }
  }

  async createPaymentIntent(amount: number, currency: string = 'NGN', gateway: string = 'paystack', metadata?: any) {
    try {
      return await paymentGatewayService.createPaymentIntent(gateway, amount, currency, metadata);
    } catch (error: any) {
      logger.error('Payment intent creation error:', error);
      throw error;
    }
  }

  async confirmPayment(paymentIntentId: string, paymentMethod: any, gateway: string = 'paystack') {
    try {
      return await paymentGatewayService.confirmPayment(gateway, paymentIntentId, paymentMethod);
    } catch (error: any) {
      logger.error('Payment confirmation error:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();