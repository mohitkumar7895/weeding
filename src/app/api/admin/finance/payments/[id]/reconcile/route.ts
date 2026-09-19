import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    const { id } = await params;
    const body = await req.json();
    const { target_status, reason } = body; 
    // target_status: 'SUCCESS' or 'FAILED'

    if (!['SUCCESS', 'FAILED'].includes(target_status)) {
      return NextResponse.json({ success: false, message: 'Invalid target status' }, { status: 400 });
    }

    const result = await transaction(async (conn) => {
      const existing = await conn.execute(`SELECT status, booking_id FROM payment_transactions WHERE id = ? FOR UPDATE`, [id]);
      const rows = existing[0] as any[];
      if (!rows.length) throw new Error('Payment transaction not found');

      const payment = rows[0];

      if (payment.status === 'SUCCESS' || payment.status === 'REFUNDED') {
         throw new Error(`Cannot reconcile a payment that is already ${payment.status}`);
      }
      
      if (payment.status === target_status) {
         throw new Error(`Payment is already ${target_status}`);
      }

      await conn.execute(`UPDATE payment_transactions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [target_status, id]);

      // If resolving to SUCCESS, we update the booking
      if (target_status === 'SUCCESS') {
        const bookingRows = await conn.execute(`SELECT status FROM bookings WHERE id = ? FOR UPDATE`, [payment.booking_id]);
        const b = (bookingRows[0] as any[])[0];
        
        if (b.status === 'PAYMENT_PENDING' || b.status === 'REQUESTED') {
           await conn.execute(`UPDATE bookings SET status = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [payment.booking_id]);
           
           // Log booking status transition
           await conn.execute(
             `INSERT INTO booking_status_history (id, booking_id, previous_status, new_status, changed_by, notes) VALUES (UUID(), ?, ?, 'CONFIRMED', ?, ?)`,
             [payment.booking_id, b.status, auth.user!.id, `Reconciled by Finance: ${reason || 'Manual override'}`]
           );
        }
      }

      return payment;
    });

    await logAudit(auth.user!.id, 'RECONCILE_PAYMENT', 'payment_transactions', id, {
      old_status: result.status,
      new_status: target_status,
      booking_id: result.booking_id,
      reason
    });

    return NextResponse.json({ success: true, message: `Payment reconciled to ${target_status} successfully` });
  } catch (error: any) {
    console.error('API /api/admin/finance/payments/[id]/reconcile PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
