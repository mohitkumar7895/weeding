import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { PaymentVerifySchema } from '@/lib/validation';
import { safeErrorResponse } from '@/lib/security';
import { randomUUID } from 'crypto';

async function customerOwnsBooking(userId: string, booking: any): Promise<boolean> {
  if (booking.customer_id === userId) return true;
  const customer = await query<any[]>(`SELECT id FROM customer_profiles WHERE user_id = ?`, [userId]);
  return Boolean(customer.length && customer[0].id === booking.customer_id);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = PaymentVerifySchema.safeParse({
      booking_id: body.booking_id,
      payment_reference: body.payment_transaction_id || body.payment_reference,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || 'Invalid payment payload' },
        { status: 400 }
      );
    }

    const { booking_id, payment_reference: payment_transaction_id } = parsed.data;
    const order_id = body.order_id || body.razorpay_order_id;
    const payment_id = body.payment_id || body.razorpay_payment_id;
    const signature = body.signature || body.razorpay_signature;

    const txns = await query<any[]>(
      `SELECT * FROM payment_transactions WHERE id = ? AND booking_id = ?`,
      [payment_transaction_id, booking_id]
    );

    if (!txns || txns.length === 0) {
      return NextResponse.json({ success: false, message: 'Payment transaction not found or mismatch' }, { status: 404 });
    }

    const txn = txns[0];

    if (txn.status === 'SUCCESS') {
      return NextResponse.json({
        success: true,
        message: 'Payment already verified successfully.',
        data: { status: 'CONFIRMED' },
      });
    }

    const bookings = await query<any[]>(`SELECT * FROM bookings WHERE id = ?`, [booking_id]);
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }
    const booking = bookings[0];

    if (!(await customerOwnsBooking(user.id, booking))) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    if (!payment_id || !signature) {
      return NextResponse.json(
        {
          success: false,
          message: 'Complete the Razorpay checkout to confirm payment. Simulated payments are not accepted.',
        },
        { status: 400 }
      );
    }

    const { defaultPaymentProvider } = await import('@/services/paymentProvider');
    let isVerified = false;
    let providerError: string | null = null;

    try {
      isVerified = await defaultPaymentProvider.verifyPayment({
        orderId: order_id || txn.transaction_ref,
        paymentId: payment_id,
        signature,
        bookingId: booking_id,
      });
      if (!isVerified) {
        providerError = 'Razorpay payment could not be verified';
      }
    } catch (err: any) {
      providerError = err.message;
    }

    if (!isVerified) {
      return NextResponse.json(
        { success: false, message: providerError || 'Payment verification failed.' },
        { status: 400 }
      );
    }

    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE payment_transactions
         SET status = 'SUCCESS',
             payment_details = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          JSON.stringify({
            razorpay_payment_id: payment_id,
            razorpay_order_id: order_id || txn.transaction_ref,
            verified_at: new Date().toISOString(),
          }),
          payment_transaction_id,
        ]
      );

      await conn.execute(
        `UPDATE bookings SET status = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [booking_id]
      );
    });

    try {
      await query(
        `INSERT INTO vendor_availability (id, vendor_id, date, is_booked, notes)
         VALUES (?, ?, ?, TRUE, ?)
         ON DUPLICATE KEY UPDATE is_booked = TRUE, notes = VALUES(notes)`,
        [randomUUID(), booking.vendor_id, booking.event_date, `Locked by Confirmed Booking ${booking.booking_number}`]
      );
    } catch (err) {
      console.error('vendor_availability lock skipped:', err);
    }

    try {
      await query(
        `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by, reason)
         VALUES (?, ?, ?, 'CONFIRMED', ?, ?)`,
        [randomUUID(), booking_id, booking.status, user.id, `Payment confirmed via ${txn.provider}`]
      );
    } catch (err) {
      console.error('booking_status_history skipped:', err);
    }

    try {
      await query(
        `INSERT INTO payouts (id, vendor_id, booking_id, amount, status, reference_id)
         VALUES (?, ?, ?, ?, 'PENDING', ?)`,
        [
          randomUUID(),
          booking.vendor_id,
          booking_id,
          booking.vendor_payout_amount ?? booking.total_amount,
          `PAYOUT_REF_${Date.now()}`,
        ]
      );
    } catch (err) {
      console.error('payout insert skipped:', err);
    }

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

    await logAudit(user.id, 'VERIFY_PAYMENT', 'payment_transactions', payment_transaction_id, {
      booking_id,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully. Booking is now CONFIRMED.',
      data: { status: 'CONFIRMED' },
    });
  } catch (error: any) {
    return safeErrorResponse(error, 'Payment verification failed');
  }
}
