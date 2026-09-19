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
    const { status, cancellation_reason, reason } = body;
    const effectiveReason = reason || cancellation_reason || null;

    const validStatuses = [
      'REQUESTED', 'PENDING', 'PENDING_VENDOR', 'ACCEPTED', 'REJECTED',
      'PAYMENT_PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED',
      'CANCELLED', 'REFUND_PROCESSING', 'REFUNDED', 'DISPUTED'
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
    const isSuperOrAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
    if (!isSuperOrAdmin) {
      if (user.role === 'VENDOR') {
        const vendor = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
        if (!vendor.length || vendor[0].id !== booking.vendor_id) {
          return NextResponse.json({ success: false, message: 'Unauthorized. You do not own this booking.' }, { status: 403 });
        }
      } else if (user.role === 'CUSTOMER') {
        const customer = await query<any[]>(`SELECT id FROM customer_profiles WHERE user_id = ?`, [user.id]);
        if (!customer.length || customer[0].id !== booking.customer_id) {
          return NextResponse.json({ success: false, message: 'Unauthorized. This booking belongs to another client.' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
      }
    }

    // State machine validation (Admins can override for arbitration)
    if (!isSuperOrAdmin) {
      if (!isValidTransition(booking.status, status, user.role as import('@/services/bookingStateMachine').UserRole)) {
        return NextResponse.json({
          success: false,
          message: `Illegal state transition from ${booking.status} to ${status} for role ${user.role}.`
        }, { status: 400 });
      }
    }

    // Transactional status transition and availability lock synchronization
    await transaction(async (conn) => {
      // 1. Anti double-booking validation when accepting or confirming
      if (status === 'ACCEPTED' || status === 'CONFIRMED') {
        const [conflicts]: any = await conn.execute(
          `SELECT id, booking_number FROM bookings 
           WHERE vendor_id = ? AND event_date = ? AND id != ? 
             AND status IN ('CONFIRMED', 'ACCEPTED', 'IN_PROGRESS') 
           FOR UPDATE`,
          [booking.vendor_id, booking.event_date, id]
        );

        if (conflicts && conflicts.length > 0) {
          throw new Error(`Date ${booking.event_date} is already committed to confirmed booking ${conflicts[0].booking_number}. Double-booking is strictly prohibited.`);
        }

        // Lock date in vendor_availability
        const targetStatus = status === 'CONFIRMED' ? 'CONFIRMED' : 'BOOKING_LOCKED';
        const [existingAvail]: any = await conn.execute(
          `SELECT id FROM vendor_availability 
           WHERE vendor_id = ? AND date = ? AND (service_id = ? OR service_id = 'ALL')
           FOR UPDATE`,
          [booking.vendor_id, booking.event_date, booking.service_id || 'ALL']
        );

        if (existingAvail && existingAvail.length > 0) {
          await conn.execute(
            `UPDATE vendor_availability 
             SET status = ?, is_booked = 1, notes = ? 
             WHERE id = ?`,
            [targetStatus, `Committed to Booking #${booking.booking_number}`, existingAvail[0].id]
          );
        } else {
          await conn.execute(
            `INSERT INTO vendor_availability (id, vendor_id, service_id, date, status, notes, is_booked)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [randomUUID(), booking.vendor_id, booking.service_id || 'ALL', booking.event_date, targetStatus, `Committed to Booking #${booking.booking_number}`]
          );
        }

        // Confirm active booking locks
        await conn.execute(
          `UPDATE vendor_booking_locks 
           SET status = 'CONFIRMED', booking_id = ? 
           WHERE (booking_id = ? OR (vendor_id = ? AND event_date = ? AND status = 'LOCKED'))`,
          [id, id, booking.vendor_id, booking.event_date]
        );
      }

      // 2. Release availability locks when rejected or cancelled
      if (status === 'REJECTED' || status === 'CANCELLED') {
        // Only release availability if no other active booking exists on this date
        const [otherBookings]: any = await conn.execute(
          `SELECT id FROM bookings 
           WHERE vendor_id = ? AND event_date = ? AND id != ? 
             AND status IN ('CONFIRMED', 'ACCEPTED', 'IN_PROGRESS')`,
          [booking.vendor_id, booking.event_date, id]
        );

        if (!otherBookings || otherBookings.length === 0) {
          await conn.execute(
            `DELETE FROM vendor_availability 
             WHERE vendor_id = ? AND date = ? AND reason IN ('BOOKING_REQUEST', 'CONFIRMED_BOOKING')`,
            [booking.vendor_id, booking.event_date]
          );

          await conn.execute(
            `UPDATE vendor_availability 
             SET status = 'AVAILABLE', is_booked = 0, notes = 'Released upon booking decline/cancellation' 
             WHERE vendor_id = ? AND date = ?`,
            [booking.vendor_id, booking.event_date]
          );
        }

        await conn.execute(
          `UPDATE vendor_booking_locks 
           SET status = 'RELEASED' 
           WHERE booking_id = ? OR (vendor_id = ? AND event_date = ? AND status = 'LOCKED')`,
          [id, booking.vendor_id, booking.event_date]
        );
      }

      // 3. Update the booking row
      await conn.execute(
        `UPDATE bookings 
         SET status = ?, cancellation_reason = COALESCE(?, cancellation_reason), updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [status, effectiveReason, id]
      );

      // 4. Record audit history in booking_status_history
      await conn.execute(
        `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by, reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [randomUUID(), id, booking.status, status, user.id, effectiveReason || `Status transitioned to ${status}`]
      );

      // 5. Ensure payout and commission records exist when completed
      if (status === 'COMPLETED') {
        // Create Commission Record
        const [existingCommission]: any = await conn.execute(
          `SELECT id FROM commission_records WHERE booking_id = ?`,
          [id]
        );
        if (!existingCommission || existingCommission.length === 0) {
          const commId = randomUUID();
          await conn.execute(
            `INSERT INTO commission_records (id, booking_id, percentage, commission_amount, is_settled, gross_amount, vendor_net_amount)
             VALUES (?, ?, ?, ?, false, ?, ?)`,
            [commId, id, booking.commission_rate || 10, booking.commission_amount || 0, booking.total_amount, booking.vendor_payout_amount]
          );
        }

        const [existingPayout]: any = await conn.execute(
          `SELECT id FROM payouts WHERE booking_id = ?`,
          [id]
        );
        if (!existingPayout || existingPayout.length === 0) {
          const payoutId = randomUUID();
          const refId = `PAY-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
          await conn.execute(
            `INSERT INTO payouts (id, vendor_id, booking_id, amount, status, reference_id)
             VALUES (?, ?, ?, ?, 'PENDING', ?)`,
            [payoutId, booking.vendor_id, id, booking.vendor_payout_amount, refId]
          );
        }
      }
    });

    // Notify appropriate party
    try {
      const { sendNotification } = await import('@/services/notificationService');
      if (user.role === 'VENDOR') {
        // Notify customer
        const custRows = await query<any[]>(`SELECT user_id FROM customer_profiles WHERE id = ?`, [booking.customer_id]);
        if (custRows.length > 0) {
          await sendNotification({
            userId: custRows[0].user_id,
            type: 'BOOKING',
            title: `Booking ${status === 'ACCEPTED' ? 'Accepted' : status === 'REJECTED' ? 'Declined' : 'Updated'}`,
            message: `Your wedding booking (${booking.booking_number}) is now ${status}.${effectiveReason ? ` Reason: ${effectiveReason}` : ''}`,
            deepLink: '/bookings',
          });
        }
      } else if (user.role === 'CUSTOMER') {
        // Notify vendor
        const vendRows = await query<any[]>(`SELECT user_id FROM vendors WHERE id = ?`, [booking.vendor_id]);
        if (vendRows.length > 0) {
          await sendNotification({
            userId: vendRows[0].user_id,
            type: 'BOOKING',
            title: `Booking Update: ${status}`,
            message: `Booking (${booking.booking_number}) was updated to ${status}.${effectiveReason ? ` Note: ${effectiveReason}` : ''}`,
            deepLink: '/vendor',
          });
        }
      }
    } catch {}

    await logAudit(user.id, 'UPDATE_BOOKING_STATUS', 'bookings', id, {
      from: booking.status,
      to: status,
      reason: effectiveReason,
    });

    return NextResponse.json({
      success: true,
      message: `Booking successfully updated to ${status}`,
      data: { id, status, previous_status: booking.status },
    });
  } catch (error: any) {
    console.error('API /api/bookings/[id]/status Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(req, context);
}
