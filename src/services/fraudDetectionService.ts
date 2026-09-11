import { query } from '@/lib/db';
import { randomUUID } from 'crypto';

export interface FraudFlagParams {
  entityType: 'USER' | 'PROFILE' | 'VENDOR' | 'BOOKING' | 'PAYMENT' | 'REVIEW';
  entityId: string;
  riskScore: number;
  flagReason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export async function createFraudFlag(params: FraudFlagParams): Promise<string> {
  const id = randomUUID();
  await query(
    `INSERT INTO fraud_flags (id, entity_type, entity_id, risk_score, flag_reason, severity, status)
     VALUES (?, ?, ?, ?, ?, ?, 'OPEN')`,
    [id, params.entityType, params.entityId, params.riskScore, params.flagReason, params.severity]
  );
  return id;
}

export async function checkPaymentRisk(userId: string, bookingId: string): Promise<boolean> {
  try {
    // Check if user has had >= 3 failed payments in the past 24 hours
    const failures = await query<any[]>(
      `SELECT COUNT(*) as failure_count 
       FROM payment_transactions pt
       JOIN bookings b ON pt.booking_id = b.id
       JOIN customer_profiles cp ON b.customer_id = cp.id
       WHERE cp.user_id = ? AND pt.status = 'FAILED' AND pt.created_at >= NOW() - INTERVAL 1 DAY`,
      [userId]
    );

    const count = failures[0]?.failure_count || 0;
    if (count >= 3) {
      await createFraudFlag({
        entityType: 'PAYMENT',
        entityId: bookingId,
        riskScore: 85,
        flagReason: `Rapid payment failure anomaly: ${count} failed payment attempts within 24 hours.`,
        severity: 'HIGH',
      });
      return false; // Elevated risk
    }
    return true;
  } catch (err: any) {
    console.error('Payment risk check error:', err.message);
    return true;
  }
}
