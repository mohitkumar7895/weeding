import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { reason = 'Customer requested cancellation' } = body;

    const bookings = await query<any[]>(`SELECT * FROM bookings WHERE id = ?`, [id]);
    if (!bookings.length) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }
    const booking = bookings[0];

    // Authorization check
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      if (user.role === 'CUSTOMER') {
        const cust = await query<any[]>(`SELECT id FROM customer_profiles WHERE user_id = ?`, [user.id]);
        if (!cust.length || cust[0].id !== booking.customer_id) {
          return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
        }
      } else if (user.role === 'VENDOR') {
        const vend = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
        if (!vend.length || vend[0].id !== booking.vendor_id) {
          return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
        }
      }
    }

    if (['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(booking.status)) {
      return NextResponse.json({
        success: false,
        message: `Booking is already ${booking.status} and cannot be cancelled.`
      }, { status: 400 });
    }

    // Calculate server-side refund according to policy
    const today = new Date();
    const eventDate = new Date(booking.event_date);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let refundPercent = 0;
    if (diffDays >= 30) {
      refundPercent = 90;
    } else if (diffDays >= 15) {
      refundPercent = 50;
    } else {
      refundPercent = 0;
    }

    // Only confirmed bookings with paid funds receive refunds
    const isPaid = booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS';
    const refundAmount = isPaid ? (parseFloat(booking.total_amount) * refundPercent) / 100 : 0;
    const newStatus = refundAmount > 0 ? 'REFUND_PROCESSING' : 'CANCELLED';
    const refundId = randomUUID();

    await transaction(async (conn) => {
      // 1. Update booking
      await conn.execute(
        `UPDATE bookings 
         SET status = ?, cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [newStatus, reason, id]
      );

      // 2. Record status history
      await conn.execute(
        `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by, reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [randomUUID(), id, booking.status, newStatus, user.id, reason]
      );

      // 3. Insert refund record if refund applies
      if (refundAmount > 0) {
        await conn.execute(
          `INSERT INTO refunds (id, booking_id, amount, reason, status)
           VALUES (?, ?, ?, ?, 'REQUESTED')`,
          [refundId, id, refundAmount, `Policy: ${diffDays} days prior (${refundPercent}% refund). Reason: ${reason}`]
        );
      }

      // 4. Cancel scheduled payout if exists
      await conn.execute(
        `UPDATE payouts SET status = 'CANCELLED' WHERE booking_id = ? AND status = 'PENDING'`,
        [id]
      );

      // 5. Release locked date in vendor_availability
      await conn.execute(
        `UPDATE vendor_availability SET is_booked = FALSE, notes = 'Released upon booking cancellation'
         WHERE vendor_id = ? AND date = ?`,
        [booking.vendor_id, booking.event_date]
      );
    });

    await logAudit(user.id, 'CANCEL_BOOKING', 'bookings', id, {
      fromStatus: booking.status,
      newStatus,
      diffDays,
      refundPercent,
      refundAmount,
      reason
    });

    return NextResponse.json({
      success: true,
      message: refundAmount > 0
        ? `Booking cancelled. A refund of ₹${refundAmount.toLocaleString('en-IN')} (${refundPercent}%) is being processed.`
        : 'Booking cancelled. As event is in less than 15 days, no refund is applicable per policy.',
      data: {
        booking_id: id,
        status: newStatus,
        diff_days: diffDays,
        refund_percent: refundPercent,
        refund_amount: refundAmount,
      }
    });
  } catch (error: any) {
    console.error('API /api/bookings/[id]/cancel Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
