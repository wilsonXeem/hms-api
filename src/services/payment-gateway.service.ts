import { logger } from '../utils/logger.util';

interface PaymentGatewayProvider {
  processPayment(amount: number, currency: string, paymentMethod: any, metadata?: any): Promise<PaymentResult>;
  createPaymentIntent(amount: number, currency: string, metadata?: any): Promise<PaymentIntent>;
  confirmPayment(paymentIntentId: string, paymentMethod: any): Promise<PaymentResult>;
  refundPayment(transactionId: string, amount?: number): Promise<RefundResult>;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  status: 'completed' | 'failed' | 'pending';
  message?: string;
  gatewayResponse?: any;
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  status: 'succeeded' | 'failed' | 'pending';
}

// Paystack Payment Gateway Implementation
class PaystackPaymentGateway implements PaymentGatewayProvider {
  private paystack: any;

  constructor() {
    try {
      this.paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
    } catch (error) {
      logger.warn('Paystack package not installed. Using mock implementation.');
      this.paystack = null;
    }
  }

  async processPayment(amount: number, currency: string, paymentMethod: any, metadata?: any): Promise<PaymentResult> {
    if (!this.paystack) {
      return this.mockPaymentProcess(amount);
    }

    try {
      const response = await this.paystack.transaction.initialize({
        amount: Math.round(amount * 100), // Convert to kobo
        email: paymentMethod.email,
        currency: currency.toUpperCase(),
        metadata: metadata || {}
      });

      return {
        success: response.status,
        transactionId: response.data.reference,
        status: 'pending',
        gatewayResponse: response.data
      };
    } catch (error: any) {
      logger.error('Paystack payment processing error:', error);
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        message: error.message
      };
    }
  }

  async createPaymentIntent(amount: number, currency: string, metadata?: any): Promise<PaymentIntent> {
    if (!this.paystack) {
      return {
        id: `ps_mock_${Date.now()}`,
        clientSecret: `ps_mock_${Date.now()}_secret`,
        amount,
        currency,
        status: 'requires_payment_method'
      };
    }

    try {
      const response = await this.paystack.transaction.initialize({
        amount: Math.round(amount * 100),
        email: metadata?.email || 'patient@hospital.com',
        currency: currency.toUpperCase(),
        metadata: metadata || {}
      });

      return {
        id: response.data.reference,
        clientSecret: response.data.authorization_url,
        amount,
        currency,
        status: 'requires_payment_method'
      };
    } catch (error: any) {
      logger.error('Paystack payment intent creation error:', error);
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  async confirmPayment(paymentIntentId: string, paymentMethod: any): Promise<PaymentResult> {
    if (!this.paystack) {
      return this.mockPaymentProcess(0);
    }

    try {
      const response = await this.paystack.transaction.verify(paymentIntentId);
      
      return {
        success: response.data.status === 'success',
        transactionId: response.data.reference,
        status: this.mapPaystackStatus(response.data.status),
        gatewayResponse: response.data
      };
    } catch (error: any) {
      logger.error('Paystack payment confirmation error:', error);
      return {
        success: false,
        transactionId: paymentIntentId,
        status: 'failed',
        message: error.message
      };
    }
  }

  async refundPayment(transactionId: string, amount?: number): Promise<RefundResult> {
    if (!this.paystack) {
      return {
        success: true,
        refundId: `ps_refund_mock_${Date.now()}`,
        amount: amount || 0,
        status: 'succeeded'
      };
    }

    try {
      const response = await this.paystack.refund.create({
        transaction: transactionId,
        amount: amount ? Math.round(amount * 100) : undefined
      });

      return {
        success: response.status,
        refundId: response.data.id,
        amount: response.data.amount / 100,
        status: response.status ? 'succeeded' : 'failed'
      };
    } catch (error: any) {
      logger.error('Paystack refund error:', error);
      throw new Error(`Failed to process refund: ${error.message}`);
    }
  }

  private mapPaystackStatus(paystackStatus: string): 'completed' | 'failed' | 'pending' {
    switch (paystackStatus) {
      case 'success':
        return 'completed';
      case 'pending':
      case 'ongoing':
        return 'pending';
      case 'failed':
      case 'abandoned':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private mockPaymentProcess(amount: number): PaymentResult {
    const isSuccessful = Math.random() > 0.05;
    return {
      success: isSuccessful,
      transactionId: `ps_mock_txn_${Date.now()}`,
      status: isSuccessful ? 'completed' : 'failed',
      message: isSuccessful ? 'Mock Paystack payment processed successfully' : 'Mock Paystack payment failed'
    };
  }
}



// Main Payment Gateway Service
export class PaymentGatewayService {
  private providers: Map<string, PaymentGatewayProvider> = new Map();

  constructor() {
    this.providers.set('paystack', new PaystackPaymentGateway());
  }

  getProvider(providerName: string): PaymentGatewayProvider {
    const provider = this.providers.get(providerName.toLowerCase());
    if (!provider) {
      throw new Error(`Payment provider '${providerName}' not supported`);
    }
    return provider;
  }

  async processPayment(
    providerName: string,
    amount: number,
    currency: string = 'USD',
    paymentMethod: any,
    metadata?: any
  ): Promise<PaymentResult> {
    const provider = this.getProvider(providerName);
    return await provider.processPayment(amount, currency, paymentMethod, metadata);
  }

  async createPaymentIntent(
    providerName: string,
    amount: number,
    currency: string = 'USD',
    metadata?: any
  ): Promise<PaymentIntent> {
    const provider = this.getProvider(providerName);
    return await provider.createPaymentIntent(amount, currency, metadata);
  }

  async confirmPayment(
    providerName: string,
    paymentIntentId: string,
    paymentMethod: any
  ): Promise<PaymentResult> {
    const provider = this.getProvider(providerName);
    return await provider.confirmPayment(paymentIntentId, paymentMethod);
  }

  async refundPayment(
    providerName: string,
    transactionId: string,
    amount?: number
  ): Promise<RefundResult> {
    const provider = this.getProvider(providerName);
    return await provider.refundPayment(transactionId, amount);
  }

  getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const paymentGatewayService = new PaymentGatewayService();