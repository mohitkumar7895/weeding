import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/auth';
import { uuidv4 } from '@/lib/uuid';

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    const result = await transaction(async (conn) => {
      // 1. Find unsettled cancellations (cancellations that do not have a refund record yet)
      const pendingCancellations = await conn.execute(`
        SELECT c.id as cancellation_id, c.booking_id, c.rule_applied_id, c.reason, c.cancelled_by_role,
               cr.refund_percentage, cr.penalty_percentage,
               b.total_amount
        FROM cancellations c
        JOIN bookings b ON c.booking_id = b.id
        LEFT JOIN cancellation_rules cr ON c.rule_applied_id = cr.id
        LEFT JOIN refunds r ON c.id = r.cancellation_id
        WHERE r.id IS NULL FOR UPDATE
      `, []);

      const records = pendingCancellations[0] as any[];
      let generatedCount = 0;

      for (const record of records) {
        // Find successful payment for this booking
        const payments = await conn.execute(`
          SELECT id, amount, status FROM payment_transactions
          WHERE booking_id = ? AND status = 'SUCCESS'
          ORDER BY created_at DESC LIMIT 1
        `, [record.booking_id]);

        const payment = (payments[0] as any[])[0];
        
        // If no successful payment, there's nothing to refund
        if (!payment) continue;

        const originalAmount = parseFloat(payment.amount);
        let refundPercentage = record.refund_percentage !== null ? parseFloat(record.refund_percentage) : 100;
        
        const refundAmount = originalAmount * (refundPercentage / 100);
        const deductionAmount = originalAmount - refundAmount;

        const refundId = uuidv4();
        await conn.execute(`
          INSERT INTO refunds (id, booking_id, cancellation_id, rule_applied_id, original_amount, deduction_amount, amount, reason, status, reference_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
        `, [
          refundId, 
          record.booking_id, 
          record.cancellation_id,
          record.rule_applied_id,
          originalAmount,
          deductionAmount,
          refundAmount,
          `Refund for Cancellation: ${record.reason || 'No reason provided'}`,
          payment.id // Store the payment ID as the reference for processing
        ]);

        await conn.execute(`
          INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, ip_address, details)
          VALUES (?, ?, 'GENERATE_REFUND', 'refunds', ?, '127.0.0.1', ?)
        `, [uuidv4(), auth.user!.id, refundId, JSON.stringify({ originalAmount, refundAmount, deductionAmount, cancellation_id: record.cancellation_id })]);

        generatedCount++;
      }

      return { generatedCount };
    });

    return NextResponse.json({ success: true, message: `Successfully generated ${result.generatedCount} pending refunds.` });
  } catch (error: any) {
    console.error('API /api/admin/finance/refunds/generate POST Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
