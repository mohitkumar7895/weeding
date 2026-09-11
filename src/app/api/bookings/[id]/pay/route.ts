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
    const { provider = 'razorpay' } = body;

    const bookings = await query<any[]>(`SELECT * FROM bookings WHERE id = ?`, [id]);
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }
    const booking = bookings[0];

    const paymentId = randomUUID();
    const txnRef = `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    await transaction(async (conn) => {
      // 1. Record payment transaction
      await conn.execute(
        `INSERT INTO payment_transactions (
          id, booking_id, transaction_ref, amount, currency, provider, status, payment_details
        ) VALUES (?, ?, ?, ?, 'INR', ?, 'SUCCESS', ?)`,
        [
          paymentId,
          id,
          txnRef,
          booking.total_amount,
          provider,
          JSON.stringify({
            gateway: provider,
            paid_at: new Date().toISOString(),
            payer_user_id: user.id
          })
        ]
      );

      // 2. Update booking status to CONFIRMED
      await conn.execute(
        `UPDATE bookings SET status = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id]
      );

      // 3. Lock vendor date in vendor_availability
      await conn.execute(
        `INSERT INTO vendor_availability (id, vendor_id, date, is_booked, notes)
         VALUES (?, ?, ?, TRUE, ?)
         ON DUPLICATE KEY UPDATE is_booked = TRUE, notes = VALUES(notes)`,
        [randomUUID(), booking.vendor_id, booking.event_date, `Locked by Confirmed Booking ${booking.booking_number}`]
      );

      // 4. Record in booking_status_history
      await conn.execute(
        `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by, reason)
         VALUES (?, ?, ?, 'CONFIRMED', ?, ?)`,
        [randomUUID(), id, booking.status, user.id, `Payment confirmed via ${provider} (Txn: ${txnRef})`]
      );

      // 5. Create payout record for the vendor (status PENDING)
      await conn.execute(
        `INSERT INTO payouts (
          id, vendor_id, booking_id, amount, status, reference_id
        ) VALUES (?, ?, ?, ?, 'PENDING', ?)`,
        [
          randomUUID(),
          booking.vendor_id,
          id,
          booking.vendor_payout_amount,
          `PAYOUT_REF_${Date.now()}`
        ]
      );
    });

    // Notify parties
    try {
      const { sendNotification } = await import('@/services/notificationService');
      const vendorUser = await query<any[]>(`SELECT user_id FROM vendors WHERE id = ?`, [booking.vendor_id]);
      if (vendorUser.length > 0) {
        await sendNotification({
          userId: vendorUser[0].user_id,
          type: 'PAYMENT',
          title: 'Booking Confirmed & Escrow Funded',
          message: `Payment of ₹${parseFloat(booking.total_amount).toLocaleString('en-IN')} confirmed for booking ${booking.booking_number}. Event date ${booking.event_date} is now officially locked!`,
          deepLink: '/vendor',
        });
      }
      await sendNotification({
        userId: user.id,
        type: 'PAYMENT',
        title: 'Payment Successful',
        message: `Your booking ${booking.booking_number} is confirmed! ₹${parseFloat(booking.total_amount).toLocaleString('en-IN')} is safely secured in WedWithMe Escrow protection.`,
        deepLink: '/dashboard',
      });
    } catch {}

    await logAudit(user.id, 'RECORD_PAYMENT', 'payment_transactions', paymentId, {
      booking_id: id,
      amount: booking.total_amount,
      txn_ref: txnRef
    });

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully. Booking is now CONFIRMED.',
      data: {
        transaction_ref: txnRef,
        amount: booking.total_amount,
        status: 'CONFIRMED'
      }
    });
  } catch (error: any) {
    console.error('API /api/bookings/[id]/pay Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
