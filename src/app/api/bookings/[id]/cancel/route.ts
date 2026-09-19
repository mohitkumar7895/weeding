import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { calculateCancellation } from '@/services/cancellationEngine';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest, { params }: any) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.id;
    const body = await req.json();
    const reason = body.reason || 'No reason provided';
    const isPreview = body.preview === true;

    // Validate ownership
    const [booking] = await query<any[]>(
      `SELECT * FROM bookings WHERE id = ?`,
      [bookingId]
    );

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    let initiatorRole: 'CUSTOMER' | 'VENDOR' | 'ADMIN' = 'CUSTOMER';
    if (user.role === 'SUPER_ADMIN' || user.role === 'FINANCE') {
      initiatorRole = 'ADMIN';
    } else if (user.role === 'VENDOR' && booking.vendor_id === user.id) {
      initiatorRole = 'VENDOR';
    } else if (user.role === 'CUSTOMER' && booking.customer_id === user.id) {
      initiatorRole = 'CUSTOMER';
    } else {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    if (['CANCELLED', 'COMPLETED', 'REJECTED'].includes(booking.status)) {
      return NextResponse.json({ success: false, message: 'Booking cannot be cancelled in its current state' }, { status: 400 });
    }

    // Call engine
    const cancellationData = await calculateCancellation(bookingId, initiatorRole);

    if (isPreview) {
      return NextResponse.json({ success: true, preview: cancellationData });
    }

    const cancelId = randomUUID();
    const refundId = randomUUID();

    await transaction(async (conn) => {
      // Create cancellation ledger
      await conn.execute(
        `INSERT INTO cancellations (id, booking_id, cancelled_by_role, user_id, reason, rule_applied_id) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [cancelId, bookingId, initiatorRole, user.id, reason, cancellationData.ruleId]
      );

      // Create refund if applicable
      if (cancellationData.calculatedRefund > 0) {
        await conn.execute(
          `INSERT INTO refunds (id, booking_id, amount, original_amount, deduction_amount, reason, status)
           VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
          [refundId, bookingId, cancellationData.calculatedRefund, cancellationData.paidAmount, cancellationData.calculatedPenalty, reason]
        );
      }

      // Update booking status
      await conn.execute(
        `UPDATE bookings SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [bookingId]
      );

      // If pending payment, optionally handle it (mark payment as cancelled if not paid)
      await conn.execute(
        `UPDATE payments SET status = 'FAILED' WHERE booking_id = ? AND status = 'PENDING'`,
        [bookingId]
      );
    });

    await logAudit(user.id, 'CANCEL_BOOKING', 'bookings', bookingId, { cancelId, refundId, refundAmount: cancellationData.calculatedRefund });

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
      cancellation_id: cancelId,
      refund_id: cancellationData.calculatedRefund > 0 ? refundId : null
    });

  } catch (error: any) {
    console.error('Cancellation error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
