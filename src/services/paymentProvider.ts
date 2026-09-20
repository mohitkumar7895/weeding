import { query } from '@/lib/db';
import { randomUUID } from 'crypto';
import { razorpayPaymentSignature, razorpayWebhookSignature, signaturesMatch } from '@/lib/razorpayHmac';

export interface PaymentOrderParams {
  amount: number;
  currency?: string;
  bookingId: string;
  receiptNumber: string;
}

export interface PaymentOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  provider: string;
  keyId?: string;
}

export interface PaymentVerificationParams {
  orderId: string;
  paymentId: string;
  signature?: string;
  bookingId: string;
}

export interface RefundParams {
  bookingId: string;
  paymentId: string;
  amount: number;
  reason: string;
}

export interface PaymentProvider {
  createOrder(params: PaymentOrderParams): Promise<PaymentOrderResult>;
  verifyPayment(params: PaymentVerificationParams): Promise<boolean>;
  verifyWebhookSignature(rawBody: string, signature: string | null): boolean;
  processRefund(params: RefundParams): Promise<{ refundId: string; status: string }>;
}

function razorpayAuthHeader() {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
}

export function hasRazorpayKeys() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export class RazorpayPaymentAdapter implements PaymentProvider {
  private providerName = 'razorpay';

  async createOrder(params: PaymentOrderParams): Promise<PaymentOrderResult> {
    if (!hasRazorpayKeys()) {
      if (process.env.RAZORPAY_ALLOW_MOCK === 'true') {
        const orderId = `order_mock_${Date.now()}`;
        await query(
          `INSERT INTO payment_provider_events (id, provider, event_id, event_type, payload_json, status)
           VALUES (?, ?, ?, 'order.created', ?, 'PROCESSED')`,
          [randomUUID(), this.providerName, orderId, JSON.stringify({ ...params, mock: true })]
        );
        return {
          orderId,
          amount: params.amount,
          currency: params.currency || 'INR',
          provider: this.providerName,
          keyId: 'rzp_mock',
        };
      }
      throw new Error('Razorpay keys are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }

    const amountPaise = Math.round(Number(params.amount) * 100);
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: razorpayAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: params.currency || 'INR',
        receipt: params.receiptNumber,
        notes: { bookingId: params.bookingId },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.description || 'Razorpay order creation failed');
    }

    await query(
      `INSERT INTO payment_provider_events (id, provider, event_id, event_type, payload_json, status)
       VALUES (?, ?, ?, 'order.created', ?, 'PROCESSED')`,
      [randomUUID(), this.providerName, data.id, JSON.stringify(data)]
    );

    return {
      orderId: data.id,
      amount: params.amount,
      currency: data.currency || 'INR',
      provider: this.providerName,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  async verifyPayment(params: PaymentVerificationParams): Promise<boolean> {
    if (!params.signature || !params.orderId || !params.paymentId) return false;

    if (!hasRazorpayKeys()) {
      return process.env.RAZORPAY_ALLOW_MOCK === 'true' && params.signature === 'mock_ok';
    }

    const expected = razorpayPaymentSignature(
      params.orderId,
      params.paymentId,
      process.env.RAZORPAY_KEY_SECRET as string
    );

    if (!signaturesMatch(expected, params.signature || null)) return false;

    const existing = await query<any[]>(
      `SELECT id FROM payment_provider_events WHERE event_id = ? AND status = 'PROCESSED'`,
      [params.paymentId]
    );
    if (existing.length > 0) return true;

    await query(
      `INSERT INTO payment_provider_events (id, provider, event_id, event_type, payload_json, status, processed_at)
       VALUES (?, ?, ?, 'payment.captured', ?, 'PROCESSED', CURRENT_TIMESTAMP)`,
      [randomUUID(), this.providerName, params.paymentId, JSON.stringify(params)]
    );
    return true;
  }

  verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !signature) return false;
    return signaturesMatch(razorpayWebhookSignature(rawBody, secret), signature);
  }

  async processRefund(params: RefundParams): Promise<{ refundId: string; status: string }> {
    if (!hasRazorpayKeys()) {
      throw new Error('Razorpay keys are not configured for refunds');
    }

    const amountPaise = Math.round(Number(params.amount) * 100);
    const response = await fetch(`https://api.razorpay.com/v1/payments/${params.paymentId}/refund`, {
      method: 'POST',
      headers: {
        Authorization: razorpayAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: amountPaise, notes: { bookingId: params.bookingId, reason: params.reason } }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.description || 'Razorpay refund failed');
    }
    await query(
      `INSERT INTO payment_provider_events (id, provider, event_id, event_type, payload_json, status, processed_at)
       VALUES (?, ?, ?, 'refund.processed', ?, 'PROCESSED', CURRENT_TIMESTAMP)`,
      [randomUUID(), this.providerName, data.id, JSON.stringify(data)]
    );
    return { refundId: data.id, status: data.status || 'PROCESSED' };
  }
}

export const defaultPaymentProvider = new RazorpayPaymentAdapter();
