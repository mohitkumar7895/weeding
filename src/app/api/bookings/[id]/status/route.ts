import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { isValidTransition } from '@/services/bookingStateMachine';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, cancellation_reason } = body;

    const validStatuses = [
      'REQUESTED', 'PENDING_VENDOR', 'ACCEPTED', 'REJECTED',
      'PAYMENT_PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED',
      'CANCELLED', 'REFUND_PENDING', 'REFUNDED', 'DISPUTED'
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 });
    }

    // Get current booking
    const bookings = await query<any[]>(`SELECT * FROM bookings WHERE id = ?`, [id]);
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }
    const booking = bookings[0];

    // Authorization check
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      if (user.role === 'VENDOR') {
        const vendor = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
        if (!vendor.length || vendor[0].id !== booking.vendor_id) {
          return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
        }
      } else if (user.role === 'CUSTOMER') {
        const customer = await query<any[]>(`SELECT id FROM customer_profiles WHERE user_id = ?`, [user.id]);
        if (!customer.length || customer[0].id !== booking.customer_id) {
          return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
        }
      }
    }

    // State machine validation (Admins can override for dispute resolution)
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      if (!isValidTransition(booking.status, status)) {
        return NextResponse.json({
          success: false,
          message: `Illegal state transition from ${booking.status} to ${status}.`
        }, { status: 400 });
      }
    }

    // Update status and record history in transaction
    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE bookings 
         SET status = ?, cancellation_reason = COALESCE(?, cancellation_reason), updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [status, cancellation_reason || null, id]
      );

      await conn.execute(
        `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by, reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [randomUUID(), id, booking.status, status, user.id, cancellation_reason || 'Status transition requested']
      );
    });

    await logAudit(user.id, 'UPDATE_BOOKING_STATUS', 'bookings', id, {
      from: booking.status,
      to: status,
      cancellation_reason
    });

    return NextResponse.json({
      success: true,
      message: `Booking updated to ${status}`,
      data: { id, status }
    });
  } catch (error: any) {
    console.error('API /api/bookings/[id]/status Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
