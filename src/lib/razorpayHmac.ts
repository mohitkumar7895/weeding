import { createHmac } from 'crypto';

export function razorpayPaymentSignature(orderId: string, paymentId: string, keySecret: string): string {
  return createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
}

export function razorpayWebhookSignature(rawBody: string, webhookSecret: string): string {
  return createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
}

export function signaturesMatch(expected: string, actual: string | null): boolean {
  if (!actual) return false;
  return expected === actual;
}
