import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { getEligiblePayouts, processPayoutWithProvider } from '@/services/payoutEngine';
import { randomUUID } from 'crypto';
import { verifyAdminRole } from '@/lib/rbac';

export async function POST(req: NextRequest) {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!authResult.ok) return authResult.response;

  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'FINANCE')) {
      return NextResponse.json(
        { success: false, message: 'Finance or Super Admin authorization required' },
        { status: 403 }
      );
    }

    const eligiblePayouts = await getEligiblePayouts();
    if (eligiblePayouts.length === 0) {
      return NextResponse.json({ success: true, message: 'No eligible payouts to process', processed: 0 });
    }

    let processedCount = 0;
    const results = [];

    for (const payout of eligiblePayouts) {
      // Prevent duplicate processing
      if (payout.status !== 'PENDING') continue;

      // Mark as processing
      await query(`UPDATE payouts SET status = 'PROCESSING', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'PENDING'`, [payout.id]);

      // Call external provider
      const providerResult = await processPayoutWithProvider(payout);

      if (providerResult.success) {
        await transaction(async (conn) => {
          await conn.execute(
            `UPDATE payouts SET status = 'PAID', reference_id = ?, payout_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [providerResult.reference_id, payout.id]
          );

          await conn.execute(
            `INSERT INTO payout_attempts (id, payout_id, attempt_number, status, response_payload)
             VALUES (?, ?, ?, 'SUCCESS', ?)`,
            [randomUUID(), payout.id, 1, JSON.stringify({ reference_id: providerResult.reference_id, actor: user.id })]
          );
          
          await conn.execute(
            `UPDATE commission_records SET is_settled = true, settled_at = CURRENT_TIMESTAMP WHERE booking_id = ?`,
            [payout.booking_id]
          );
        });

        await logAudit(user.id, 'PROCESS_PAYOUT', 'payouts', payout.id, { status: 'PAID', ref: providerResult.reference_id });
        results.push({ payout_id: payout.id, status: 'PAID' });
        processedCount++;
      } else {
        await transaction(async (conn) => {
          await conn.execute(
            `UPDATE payouts SET status = 'FAILED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [payout.id]
          );

          await conn.execute(
            `INSERT INTO payout_attempts (id, payout_id, attempt_number, status, error_message)
             VALUES (?, ?, ?, 'FAILED', ?)`,
            [randomUUID(), payout.id, 1, providerResult.error]
          );
        });
        await logAudit(user.id, 'PROCESS_PAYOUT', 'payouts', payout.id, { status: 'FAILED', error: providerResult.error });
        results.push({ payout_id: payout.id, status: 'FAILED', error: providerResult.error });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} payouts`,
      processed: processedCount,
      details: results
    });

  } catch (error: any) {
    console.error('Payout processing error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
