import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { PaymentVerifySchema } from '@/lib/validation';
import { safeErrorResponse } from '@/lib/security';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    
    // Partially validate input to prevent tampered payloads
    const parsed = PaymentVerifySchema.parse({
      booking_id: body.booking_id,
      payment_reference: body.payment_transaction_id,
    });
    
    const { booking_id, payment_reference: payment_transaction_id } = parsed;
    const order_id = body.order_id || body.razorpay_order_id;
    const payment_id = body.payment_id || body.razorpay_payment_id;
    const signature = body.signature || body.razorpay_signature;

    // 1. Fetch transaction and booking to verify authorization
    const txns = await query<any[]>(
      `SELECT * FROM payment_transactions WHERE id = ? AND booking_id = ?`,
      [payment_transaction_id, booking_id]
    );

    if (!txns || txns.length === 0) {
      return NextResponse.json({ success: false, message: 'Payment transaction not found or mismatch' }, { status: 404 });
    }

    const txn = txns[0];
    
    if (txn.status === 'SUCCESS') {
      return NextResponse.json({ success: true, message: 'Payment already verified successfully.', data: { status: 'CONFIRMED' } });
    } else if (txn.status !== 'PENDING') {
      return NextResponse.json({ success: false, message: `Payment transaction already processed with status: ${txn.status}` }, { status: 400 });
    }

    const bookings = await query<any[]>(`SELECT * FROM bookings WHERE id = ?`, [booking_id]);
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }
    const booking = bookings[0];

    // Authorization check - customer owns the booking
    const customer = await query<any[]>(`SELECT id FROM customer_profiles WHERE user_id = ?`, [user.id]);
    if (!customer.length || customer[0].id !== booking.customer_id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    // 2. Call the payment provider to verify
    const { defaultPaymentProvider } = await import('@/services/paymentProvider');
    
    // Using verifyPayment from StandardPaymentAdapter (note params matching)
    let isVerified = false;
    let providerError = null;

    try {
      isVerified = await defaultPaymentProvider.verifyPayment({
        orderId: order_id || txn.transaction_ref,
        paymentId: payment_id,
        signature,
        bookingId: booking_id,
      });
      if (!isVerified) {
        providerError = 'Razorpay signature verification failed';
      }
    } catch (err: any) {
      providerError = err.message;
    }

    await transaction(async (conn) => {
      if (isVerified) {
        // SUCCESS HANDLING
        // 1. Update payment transaction
        await conn.execute(
          `UPDATE payment_transactions SET status = 'SUCCESS', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [payment_transaction_id]
        );

        // 2. Update booking status to CONFIRMED
        await conn.execute(
          `UPDATE bookings SET status = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [booking_id]
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
          [randomUUID(), booking_id, booking.status, user.id, `Payment confirmed via ${txn.provider}`]
        );

        // 5. Create payout record for the vendor (status PENDING)
        await conn.execute(
          `INSERT INTO payouts (
            id, vendor_id, booking_id, amount, status, reference_id
          ) VALUES (?, ?, ?, ?, 'PENDING', ?)`,
          [
            randomUUID(),
            booking.vendor_id,
            booking_id,
            booking.vendor_payout_amount,
            `PAYOUT_REF_${Date.now()}`
          ]
        );
      } else if (providerError === 'PENDING') {
        // UNKNOWN HANDLING - Wait for Webhook Reconciliation
        const details = JSON.stringify({ note: 'Awaiting provider reconciliation', check_at: new Date().toISOString() });
        await conn.execute(
          `UPDATE payment_transactions 
           SET payment_details = JSON_SET(payment_details, '$.reconciliation_note', ?) 
           WHERE id = ?`,
          [details, payment_transaction_id]
        );
      } else {
        // FAILED HANDLING
        const errorDetails = JSON.stringify({ error: providerError, failed_at: new Date().toISOString() });
        
        await conn.execute(
          `UPDATE payment_transactions 
           SET status = 'FAILED', payment_details = JSON_SET(payment_details, '$.error_log', ?), updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [errorDetails, payment_transaction_id]
        );
        
        // Note: Booking remains in PAYMENT_PENDING so the user can retry.
      }
    });

    // Notify parties on success
    if (isVerified) {
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
    }

    await logAudit(user.id, 'VERIFY_PAYMENT', 'payment_transactions', payment_transaction_id, {
      booking_id,
      success: isVerified,
      error: providerError
    });

    if (isVerified) {
      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully. Booking is now CONFIRMED.',
        data: { status: 'CONFIRMED' }
      });
    } else if (providerError === 'PENDING') {
      return NextResponse.json({
        success: true,
        message: 'Payment is being confirmed by the provider. Please check back later.',
        data: { status: 'PAYMENT_PENDING' }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Payment verification failed.',
        error: providerError
      }, { status: 400 });
    }

  } catch (error: any) {
    return safeErrorResponse(error, 'Payment verification failed');
  }
}
