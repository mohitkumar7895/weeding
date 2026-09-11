import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getSessionUser();
    if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const { id: disputeId } = await params;
    const body = await req.json();
    const { resolution_decision, resolution_notes } = body;
    // resolution_decision: 'REFUND_CUSTOMER' | 'PAYOUT_VENDOR' | 'SPLIT' | 'REJECT_COMPLAINT'

    if (!resolution_decision || !resolution_notes) {
      return NextResponse.json({ success: false, message: 'Resolution decision and notes are required' }, { status: 400 });
    }

    const disputes = await query<any[]>(`SELECT * FROM disputes WHERE id = ?`, [disputeId]);
    if (!disputes.length) {
      return NextResponse.json({ success: false, message: 'Dispute not found' }, { status: 404 });
    }
    const dispute = disputes[0];

    const bookings = await query<any[]>(`SELECT * FROM bookings WHERE id = ?`, [dispute.booking_id]);
    const booking = bookings.length ? bookings[0] : null;

    await transaction(async (conn) => {
      // 1. Update dispute status
      await conn.execute(
        `UPDATE disputes SET 
          status = 'RESOLVED',
          resolution = ?,
          resolved_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [JSON.stringify({ decision: resolution_decision, notes: resolution_notes, resolved_by: admin.id }), disputeId]
      );

      // 2. Financial settlement based on decision
      if (booking) {
        if (resolution_decision === 'REFUND_CUSTOMER') {
          // Refund full amount to customer, cancel vendor payout
          await conn.execute(
            `INSERT INTO refunds (id, booking_id, amount, reason, status)
             VALUES (?, ?, ?, ?, 'COMPLETED')`,
            [randomUUID(), booking.id, booking.total_amount, `Dispute ${disputeId} resolved: Customer refund.`]
          );
          await conn.execute(`UPDATE bookings SET status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [booking.id]);
          await conn.execute(`UPDATE payouts SET status = 'CANCELLED' WHERE booking_id = ?`, [booking.id]);
        } else if (resolution_decision === 'PAYOUT_VENDOR') {
          // Release vendor payout
          await conn.execute(`UPDATE bookings SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [booking.id]);
          await conn.execute(`UPDATE payouts SET status = 'ELIGIBLE' WHERE booking_id = ?`, [booking.id]);
        } else {
          // Reject complaint
          await conn.execute(`UPDATE bookings SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [booking.id]);
        }

        // Record status history
        await conn.execute(
          `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by, reason)
           VALUES (?, ?, 'DISPUTED', ?, ?, ?)`,
          [randomUUID(), booking.id, resolution_decision === 'REFUND_CUSTOMER' ? 'REFUNDED' : 'COMPLETED', admin.id, `Dispute Resolution: ${resolution_decision}`]
        );
      }
    });

    await logAudit(admin.id, 'RESOLVE_DISPUTE', 'disputes', disputeId, {
      decision: resolution_decision,
      notes: resolution_notes,
    });

    return NextResponse.json({
      success: true,
      message: `Dispute resolved successfully with decision: ${resolution_decision}`,
    });
  } catch (error: any) {
    console.error('Resolve dispute error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
